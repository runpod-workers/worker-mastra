/**
 * Runpod Documentation Ingestion Script
 *
 * This script clones/pulls the runpod/docs repository,
 * processes markdown files into chunks, generates embeddings,
 * and stores them in a LibSQL vector database for RAG queries.
 *
 * Usage:
 *   OPENAI_API_KEY=<key> npx tsx scripts/ingest-docs.ts
 *
 * Required environment variables:
 *   - OPENAI_API_KEY: OpenAI API key for generating embeddings
 */

import { MDocument } from "@mastra/rag";
import { openai } from "@ai-sdk/openai";
import { embedMany } from "ai";
import { LibSQLVector } from "@mastra/libsql";
import simpleGit, { SimpleGit } from "simple-git";
import * as fs from "fs";
import * as path from "path";

// Configuration
const REPO_URL = "https://github.com/runpod/docs.git";
const LOCAL_REPO_PATH = "/tmp/runpod-docs-repo";
const INDEX_NAME = "runpod_docs";
const EMBEDDING_DIMENSION = 1536; // text-embedding-3-small dimension

// Vector DB path: env var > /runpod-volume (network volume) > local
const getVectorDbPath = () => {
  if (process.env.VECTOR_DB_PATH) return process.env.VECTOR_DB_PATH;
  if (fs.existsSync("/runpod-volume")) return "/runpod-volume/vector.db";
  return path.resolve(process.cwd(), "vector.db");
};
const VECTOR_DB_PATH = getVectorDbPath();

// Directories to include
const INCLUDED_DIRS = [
  "get-started",
  "serverless",
  "pods",
  "sdks",
  "hub",
];

// Paths to exclude
const EXCLUDED_PATHS = [".cursor", ".github", "helpers", "images", "logo", "api-reference"];

// File extensions to include
const INCLUDED_EXTENSIONS = [".md", ".mdx"];

interface DocFile {
  docId: string;
  content: string;
}

/**
 * Clone or pull the runpod/docs repository
 */
async function syncRepository(): Promise<string> {
  const git: SimpleGit = simpleGit();

  if (fs.existsSync(LOCAL_REPO_PATH)) {
    console.log("Pulling latest changes...");
    const repoGit = simpleGit(LOCAL_REPO_PATH);
    await repoGit.fetch("origin", "main");
    await repoGit.checkout("main");
    await repoGit.pull("origin", "main");
  } else {
    console.log("Cloning repository...");
    await git.clone(REPO_URL, LOCAL_REPO_PATH, [
      "--branch",
      "main",
      "--single-branch",
      "--depth",
      "1",
    ]);
  }

  return LOCAL_REPO_PATH;
}

/**
 * Check if a path should be included
 */
function shouldIncludePath(relativePath: string): boolean {
  for (const excluded of EXCLUDED_PATHS) {
    if (relativePath.startsWith(excluded + "/") || relativePath === excluded) {
      return false;
    }
  }
  return true;
}

/**
 * Strip frontmatter from markdown content
 */
function stripFrontmatter(content: string): string {
  const frontmatterRegex = /^---\s*\n[\s\S]*?\n---\s*\n/;
  return content.replace(frontmatterRegex, "").trim();
}

/**
 * Walk directory recursively and collect markdown files
 */
function walkDirectory(dirPath: string, baseDir: string): DocFile[] {
  const files: DocFile[] = [];

  if (!fs.existsSync(dirPath)) {
    return files;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (!shouldIncludePath(relativePath)) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...walkDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (INCLUDED_EXTENSIONS.includes(ext)) {
        const rawContent = fs.readFileSync(fullPath, "utf-8");
        const content = stripFrontmatter(rawContent);
        
        // Skip empty or very short documents
        if (content.length < 100) {
          continue;
        }
        
        files.push({
          docId: relativePath,
          content,
        });
      }
    }
  }

  return files;
}

/**
 * Get all documentation files from the repository
 */
function getDocumentationFiles(repoPath: string): DocFile[] {
  const allFiles: DocFile[] = [];

  // Walk included directories
  for (const includedDir of INCLUDED_DIRS) {
    const dirPath = path.join(repoPath, includedDir);
    const files = walkDirectory(dirPath, repoPath);
    allFiles.push(...files);
  }

  // Also get root-level .mdx files
  const rootEntries = fs.readdirSync(repoPath, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
      const fullPath = path.join(repoPath, entry.name);
      const rawContent = fs.readFileSync(fullPath, "utf-8");
      const content = stripFrontmatter(rawContent);
      
      if (content.length >= 100) {
        allFiles.push({
          docId: entry.name,
          content,
        });
      }
    }
  }

  return allFiles;
}

async function main() {
  console.log("=== Runpod Documentation Ingestion ===\n");

  // Check for OpenAI API key
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY environment variable is required");
    process.exit(1);
  }

  // Sync repository
  console.log("--- Syncing repository ---");
  const repoPath = await syncRepository();
  console.log(`Repository synced to: ${repoPath}\n`);

  // Get documentation files
  console.log("--- Scanning documentation files ---");
  const docFiles = getDocumentationFiles(repoPath);
  console.log(`Found ${docFiles.length} documentation files\n`);

  if (docFiles.length === 0) {
    console.error("No documentation files found. Exiting.");
    process.exit(1);
  }

  // Process and chunk documents
  console.log("--- Chunking documents ---");
  const allChunks: { text: string; source: string }[] = [];

  for (const doc of docFiles) {
    const mdoc = MDocument.fromMarkdown(doc.content);
    const chunks = await mdoc.chunk({
      strategy: "recursive",
      maxSize: 512,
      overlap: 50,
    });

    for (const chunk of chunks) {
      if (chunk.text.length > 50) {
        allChunks.push({
          text: chunk.text,
          source: doc.docId,
        });
      }
    }
    console.log(`  ${doc.docId}: ${chunks.length} chunks`);
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);

  // Generate embeddings in batches
  console.log("\n--- Generating embeddings ---");
  const BATCH_SIZE = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allChunks.length / BATCH_SIZE)}...`);
    
    const { embeddings } = await embedMany({
      model: openai.embedding("text-embedding-3-small"),
      values: batch.map((chunk) => chunk.text),
    });
    
    allEmbeddings.push(...embeddings);
  }

  console.log(`Generated ${allEmbeddings.length} embeddings`);

  // Initialize vector store
  console.log("\n--- Storing in vector database ---");
  console.log(`Vector database: ${VECTOR_DB_PATH}`);

  const vectorStore = new LibSQLVector({
    connectionUrl: `file:${VECTOR_DB_PATH}`,
  });

  // Create or recreate index
  try {
    const indexes = await vectorStore.listIndexes();
    if (indexes.includes(INDEX_NAME)) {
      console.log(`Deleting existing index: ${INDEX_NAME}`);
      await vectorStore.deleteIndex({ indexName: INDEX_NAME });
    }
  } catch {
    // Index doesn't exist, which is fine
  }

  await vectorStore.createIndex({
    indexName: INDEX_NAME,
    dimension: EMBEDDING_DIMENSION,
  });
  console.log(`Created index: ${INDEX_NAME}`);

  // Upsert embeddings
  await vectorStore.upsert({
    indexName: INDEX_NAME,
    vectors: allEmbeddings,
    metadata: allChunks.map((chunk) => ({
      text: chunk.text,
      source: chunk.source,
    })),
  });

  console.log(`\n=== Ingestion Complete ===`);
  console.log(`Documents processed: ${docFiles.length}`);
  console.log(`Chunks stored: ${allEmbeddings.length}`);
  console.log(`Vector database: ${VECTOR_DB_PATH}`);
  console.log(`\nYou can now use the Docs RAG Agent to query the documentation!`);
}

main().catch(console.error);
