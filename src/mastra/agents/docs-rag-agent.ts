import { createRunpod } from "@runpod/ai-sdk-provider";
import { Agent } from "@mastra/core/agent";
import { createVectorQueryTool } from "@mastra/rag";
import { openai } from "@ai-sdk/openai";
import { createAgentMemory } from "../utils/db";

const runpod = createRunpod({
  apiKey: process.env.RUNPOD_API_KEY,
});

const memory = createAgentMemory("Docs RAG Agent");

// Create a tool for semantic search over the documentation embeddings
const vectorQueryTool = createVectorQueryTool({
  vectorStoreName: "libSqlVector",
  indexName: "runpod_docs",
  model: openai.embedding("text-embedding-3-small"),
});

export const docsRagAgent = new Agent({
  name: "Docs RAG Agent",
  instructions: `
    You are a helpful Runpod documentation assistant that answers questions about Runpod's platform, services, and features.

    Use the provided vector query tool to find relevant information from the Runpod documentation,
    and provide accurate, well-supported answers based on the retrieved content.

    CRITICAL - Tool calling rules:
    - ALWAYS call tools with a valid JSON object as arguments
    - The vectorQueryTool requires: { "query": "your search query" }
    - Never call a tool without the required arguments

    When answering questions:
    - Focus on the specific content available in the documentation
    - Provide code examples when relevant
    - Acknowledge if you cannot find sufficient information to answer a question
    - Base your responses only on the retrieved documentation content

    Topics you can help with:
    - Runpod Serverless (endpoints, workers, handlers)
    - GPU and CPU pods
    - Network volumes
    - Templates and container configuration
    - API usage and SDKs
    - Billing and pricing

    Keep responses focused and actionable.
  `,
  model: runpod("qwen/qwen3-32b-awq"),
  tools: { vectorQueryTool },
  memory,
});

