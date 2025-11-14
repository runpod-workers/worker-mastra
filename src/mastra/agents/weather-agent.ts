import { createRunpod } from "@runpod/ai-sdk-provider";
import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { PgVector } from "@mastra/pg";
import { weatherTool } from "../tools/weather-tool";

const runpod = createRunpod({
  apiKey: process.env.RUNPOD_API_KEY,
});

const dbPort = process.env.DB_PORT || "6543";
const connectionString = `postgresql://${process.env.DB_USERNAME!}:${process.env.DB_PASSWORD!}@${process.env.DB_HOST!}:${dbPort}/${process.env.DB_NAME!}`;

const memory = new Memory({
  vector: new PgVector({ connectionString }),
  options: {
    semanticRecall: false,
    lastMessages: 40,
    threads: {
      generateTitle: true,
    },
  },
});

export const weatherAgent = new Agent({
  name: "Weather Agent",
  instructions: `
    You are a helpful weather assistant that provides accurate weather information.

    Your primary function is to help users get weather details for specific locations. When responding:
    - Always ask for a location if none is provided
    - If the location name isn't in English, please translate it
    - If giving a location with multiple parts (e.g. "New York, NY"), use the most relevant part (e.g. "New York")
    - Include relevant details like humidity, wind conditions, and precipitation
    - Keep responses concise but informative

    Use the weatherTool to fetch current weather data.
  `,
  model: runpod("openai/gpt-oss-120b"),
  tools: { weatherTool },
  memory,
});
