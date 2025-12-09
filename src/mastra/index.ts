import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent";

const host = process.env.DB_HOST!;
const port = parseInt(process.env.DB_PORT || "6543");
const user = process.env.DB_USERNAME!;
const database = process.env.DB_NAME!;
const password = process.env.DB_PASSWORD!;

export const pgStorage = new PostgresStore({
  host,
  port,
  user,
  database,
  password,
});

export const mastra = new Mastra({
  agents: { weatherAgent },
  storage: pgStorage,
  logger: new PinoLogger(),
  observability: {
    default: { enabled: true },
  },
  telemetry: {
    enabled: true,
  },
});
