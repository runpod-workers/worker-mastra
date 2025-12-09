import { PostgresStore, PgVector } from "@mastra/pg";
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

// Global storage for Mastra instance
export const createStorage = () => {
  if (!hasDbCredentials) {
    console.log("[Mastra] No database credentials provided, using in-memory storage");
    return undefined;
  }

  return new PostgresStore({
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT || "6543"),
    user: process.env.DB_USERNAME!,
    database: process.env.DB_NAME!,
    password: process.env.DB_PASSWORD!,
  });
};

// Agent memory with PgVector for embeddings
export const createAgentMemory = (agentName: string) => {
  if (!hasDbCredentials) {
    console.log(`[${agentName}] No database credentials provided, running without persistent memory`);
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

