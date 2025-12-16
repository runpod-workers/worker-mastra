import { existsSync } from "fs";
import { PostgresStore, PgVector } from "@mastra/pg";
import { LibSQLStore } from "@mastra/libsql";
import { Memory } from "@mastra/memory";

// Check if all required DB credentials are provided
export const hasDbCredentials =
  process.env.DB_HOST &&
  process.env.DB_USERNAME &&
  process.env.DB_NAME &&
  process.env.DB_PASSWORD;

// Build connection string from env vars
export const getConnectionString = () =>
  `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT || "6543"}/${process.env.DB_NAME}`;

// Determine storage path: prefer /runpod-volume (network volume), fallback to /tmp
const getStoragePath = () => {
  if (process.env.STORAGE_PATH) {
    return process.env.STORAGE_PATH;
  }
  // Use network volume if available, otherwise ephemeral /tmp
  if (existsSync("/runpod-volume")) {
    return "/runpod-volume/mastra-storage.db";
  }
  return "/tmp/mastra-storage.db";
};

// Global storage for Mastra instance
export const createStorage = () => {
  if (hasDbCredentials) {
    console.log("[Mastra] Using PostgreSQL storage");
    return new PostgresStore({
      host: process.env.DB_HOST!,
      port: parseInt(process.env.DB_PORT || "6543"),
      user: process.env.DB_USERNAME!,
      database: process.env.DB_NAME!,
      password: process.env.DB_PASSWORD!,
    });
  }

  const storagePath = getStoragePath();
  const isPersistent = storagePath.startsWith("/runpod-volume");
  console.log(
    `[Mastra] Using file-based storage at ${storagePath} (${isPersistent ? "persistent" : "ephemeral"})`
  );
  return new LibSQLStore({
    url: `file:${storagePath}`,
  });
};

// Agent memory with PgVector for embeddings
export const createAgentMemory = (agentName: string) => {
  if (!hasDbCredentials) {
    console.log(
      `[${agentName}] No database credentials provided, running without persistent memory`
    );
    return undefined;
  }

  return new Memory({
    vector: new PgVector({
      connectionString: getConnectionString(),
    }),
    options: {
      semanticRecall: false,
      lastMessages: 40,
      threads: {
        generateTitle: true,
      },
    },
  });
};
