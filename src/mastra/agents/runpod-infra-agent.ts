import { createRunpod } from "@runpod/ai-sdk-provider";
import { Agent } from "@mastra/core/agent";
import { MCPClient } from "@mastra/mcp";
import { createAgentMemory } from "../utils/db";

const runpod = createRunpod({
  apiKey: process.env.RUNPOD_API_KEY,
});

const memory = createAgentMemory("RunPod Infra Agent");

// MCP client for RunPod API tools
const mcp = new MCPClient({
  id: "runpod-infra-mcp",
  servers: {
    runpod: {
      command: "npx",
      args: ["@runpod/mcp-server@latest"],
      env: {
        RUNPOD_API_KEY: process.env.RUNPOD_API_KEY || "",
      },
    },
  },
  timeout: 60000,
});

// Only include specific pod management tools
const allowedTools = ["runpod_list-pods", "runpod_create-pod", "runpod_delete-pod"];
const allTools = await mcp.getTools();
const podTools = Object.fromEntries(
  Object.entries(allTools).filter(([name]) => allowedTools.includes(name))
);

export const runpodInfraAgent = new Agent({
  name: "RunPod Infra Agent",
  instructions: `
    You are a RunPod pod management assistant. You help users list, create, and delete pods.

    Available operations:
    - List pods (filter by GPU/CPU type)
    - Create new pods
    - Delete pods

    CRITICAL - Tool calling rules:
    - ALWAYS call tools with a valid JSON object as arguments
    - If a tool requires no parameters, pass an empty object: {}
    - Never call a tool without arguments - this causes validation errors

    When creating pods:
    - Always confirm the GPU type and count before creation
    - Use sensible defaults when not specified (e.g., 1 GPU)

    When deleting pods:
    - Always confirm with the user before deletion
    - Provide the pod ID and name for verification

    Keep responses concise and actionable.
  `,
  model: runpod("qwen/qwen3-32b-awq"),
  tools: podTools,
  memory,
});

