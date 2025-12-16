import { Mastra } from "@mastra/core";
import { PinoLogger } from "@mastra/loggers";
import { weatherAgent } from "./agents/weather-agent";
import { runpodInfraAgent } from "./agents/runpod-infra-agent";
import { webSearchAgent } from "./agents/web-search-agent";
import { createStorage } from "./utils/db";

const storage = createStorage();

export const mastra = new Mastra({
  agents: { weatherAgent, runpodInfraAgent, webSearchAgent },
  storage,
  logger: new PinoLogger(),
  observability: {
    default: { enabled: true },
  },
  telemetry: {
    enabled: true,
  },
});
