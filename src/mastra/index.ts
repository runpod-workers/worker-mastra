import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { LibSQLVector } from "@mastra/libsql";
import { weatherAgent } from "./agents/weather-agent";
import { runpodInfraAgent } from "./agents/runpod-infra-agent";
import { webSearchAgent } from "./agents/web-search-agent";
import { docsRagAgent } from "./agents/docs-rag-agent";
import { createStorage } from "./utils/db";
import { existsSync } from "fs";
import * as path from "path";

const storage = createStorage();

// Vector store for RAG
// Priority: VECTOR_DB_PATH env > /runpod-volume > local ./vector.db > /tmp
const getVectorDbPath = () => {
  if (process.env.VECTOR_DB_PATH) return process.env.VECTOR_DB_PATH;
  if (existsSync("/runpod-volume")) return "/runpod-volume/vector.db";
  // Check for local vector.db in project root (for development)
  const localPath = path.resolve(process.cwd(), "vector.db");
  if (existsSync(localPath)) return localPath;
  return "/tmp/vector.db";
};

const vectorDbPath = getVectorDbPath();

const libSqlVector = new LibSQLVector({
  connectionUrl: `file:${vectorDbPath}`,
});

console.log(`[Mastra] Vector store path: ${vectorDbPath}`);

export const mastra = new Mastra({
  agents: { weatherAgent, runpodInfraAgent, webSearchAgent, docsRagAgent },
  vectors: { libSqlVector },
  storage,
  logger: new PinoLogger(),
  observability: {
    default: { enabled: true },
  },
  telemetry: {
    enabled: true,
  },
});
