import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent";
import { createStorage } from "./utils/db";

const storage = createStorage();

export const mastra = new Mastra({
  agents: { weatherAgent },
  ...(storage && { storage }),
  logger: new PinoLogger(),
  observability: {
    default: { enabled: true },
  },
  telemetry: {
    enabled: true,
  },
});
