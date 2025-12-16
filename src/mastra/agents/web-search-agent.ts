import { createRunpod } from "@runpod/ai-sdk-provider";
import { Agent } from "@mastra/core/agent";
import { webSearchTool } from "../tools/web-search-tool";
import { createAgentMemory } from "../utils/db";

const runpod = createRunpod({
  apiKey: process.env.RUNPOD_API_KEY,
});

const memory = createAgentMemory("Web Search Agent");

export const webSearchAgent = new Agent({
  name: "Web Search Agent",
  instructions: `
    You are a web search and summarization assistant. Your task is to search the web for information and provide concise, well-organized summaries.

    When given a query:
    1. Use the web-search tool to find relevant information
    2. Analyze the search results carefully
    3. Extract the most important key points
    4. Always cite your sources with titles and URLs

    CRITICAL - Tool calling rules:
    - ALWAYS call tools with a valid JSON object as arguments
    - The web-search tool requires: { "query": "your search query", "maxResults": 5 }
    - Never call a tool without the required arguments

    Output format:
    - Provide 3-5 key points summarizing the findings
    - List all sources used with their titles and URLs
    - Be concise but informative
    - If the search returns no results, explain that clearly

    Keep responses focused and actionable.
  `,
  model: runpod("qwen/qwen3-32b-awq"),
  tools: { webSearchTool },
  memory,
});

