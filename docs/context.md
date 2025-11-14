# Project Conventions

This document outlines the key technical conventions and architectural decisions for the `worker-mastra` project.

## Core Technologies

- **Language:** TypeScript
- **AI Framework:** Mastra (`@mastra/core`)
  - Core logic is implemented as Mastra Agents (e.g., `weatherAgent`, `runpodInfraAgent`).
  - External functionalities are integrated as Mastra Tools or via MCP (Model Context Protocol).
  - Multiple agents can coexist in a single Mastra instance.
- **AI Provider:** RunPod AI SDK Provider (`@runpod/ai-sdk-provider` v0.9.0)
  - Uses OpenAI GPT-OSS-120B model (`openai/gpt-oss-120b`) for agent reasoning.
  - Supports streaming and non-streaming text generation.
- **Server Framework:** Hono (via Mastra's built-in server)
- **Storage:** PostgreSQL with PgVector extension
  - Global storage: `PostgresStore` from `@mastra/pg`
  - Agent memory: `PgVector` from `@mastra/pg` for embeddings
- **External Tool Integration:** MCP (Model Context Protocol) via `@mastra/mcp`
  - MCP servers provide external tools to agents (e.g., RunPod API tools)
  - MCP configuration in `src/mastra/mcp-config.ts` manages server connections
- **Deployment:** Runpod Serverless CPU with Load Balancer endpoint type

## Architecture

- **Serverless Deployment:** Designed for Runpod Serverless CPU endpoints with Load Balancer support
- **Dual Server Pattern:** Uses a wrapper server (`server-entry.mjs`) that:
  - Handles `/ping` health check endpoint (required by Runpod Load Balancer)
  - Proxies all other requests to the internal Mastra server
  - Manages initialization state (returns 204 during cold start, 200 when ready)
- **Port Configuration:**
  - `PORT`: External port (default: 80) - where wrapper server listens
  - `PORT_HEALTH`: Health check port (default: same as PORT)
  - `MASTRA_PORT`: Internal Mastra server port (default: 4111)
- **Configuration:** Environment variables for API keys, database connection, and port configuration

## Memory and Storage Configuration

- **Global Storage Provider (Postgres):** Configure a single Postgres storage provider globally on the main Mastra instance in `src/mastra/index.ts`. This storage will be inherited by all agents and memory instances.

```typescript
// ✅ Correct: Global Postgres storage configuration
import { Mastra } from "@mastra/core";
import { PostgresStore } from "@mastra/pg";
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
  agents: { weatherAgent, runpodInfraAgent },
  storage: pgStorage,
});
```

- **Agent Memory Configuration (PgVector):** Agents should create a `Memory` instance that uses PgVector for embeddings. Storage is inherited from the global Mastra instance; do not reconfigure storage per agent.

```typescript
// ✅ Correct: Agent memory with PgVector, inherits global storage
import { Memory } from "@mastra/memory";
import { PgVector } from "@mastra/pg";

const dbPort = process.env.DB_PORT || "6543";
const connectionString = `postgresql://${process.env.DB_USERNAME!}:${process.env.DB_PASSWORD!}@${process.env.DB_HOST!}:${dbPort}/${process.env.DB_NAME!}`;

export const memory = new Memory({
  vector: new PgVector({ connectionString }),
  options: {
    semanticRecall: false,
    lastMessages: 40,
    threads: { generateTitle: true },
  },
});
```

- **Database Port:** Default to `6543` (transaction pooler) for serverless deployments, use `5432` for direct connections

## Docker Build and Deployment

- **Multi-stage Build:** Uses Node.js Alpine base image for minimal size (< 1.5GB)
- **Production Dependencies:** Only production dependencies installed in final image
- **Non-root User:** Runs as non-root user (`mastra:nodejs`) for security
- **Build Output:** Mastra build produces `.mastra/output/` directory
- **Entrypoint:** `server-entry.mjs` wraps Mastra server and handles health checks
- **Platform:** Build for `linux/amd64` platform

## Health Check Endpoint

- **Endpoint:** `GET /ping`
- **Response During Initialization:** `204 No Content` (Runpod expects this during cold start)
- **Response When Ready:** `200 OK` with `{"status": "healthy"}` JSON body
- **Purpose:** Required by Runpod Load Balancer for worker health monitoring

## Environment Variables

### Required

- `RUNPOD_API_KEY`: Runpod API key for accessing AI models
- `DB_HOST`: PostgreSQL database host address
- `DB_USERNAME`: PostgreSQL database username
- `DB_NAME`: PostgreSQL database name
- `DB_PASSWORD`: PostgreSQL database password

### Optional

- `PORT`: Server port (default: `80`)
- `PORT_HEALTH`: Health check port (default: same as `PORT`)
- `MASTRA_PORT`: Internal Mastra server port (default: `4111`)
- `DB_PORT`: PostgreSQL database port (default: `6543` for transaction pooler)

## Agent Patterns

- **Multiple Agents:** Multiple agents can be registered in a single Mastra instance. Each agent has its own memory instance but shares the global storage provider.
- **Tool Integration:** Agents can use:
  - Mastra Tools: Direct tool implementations (e.g., `weatherTool`)
  - MCP Tools: External tools provided via MCP servers (e.g., RunPod API tools)
- **MCP Integration:** MCP servers are configured in `src/mastra/mcp-config.ts`. Agents access MCP tools by importing the MCP client and filtering available tools as needed.

## Local Development

- **Docker Compose:** `docker-compose.yml` provides PostgreSQL with pgvector and pgAdmin for local development
- **MCP Dependencies:** Some agents require external MCP servers (e.g., `runpod-mcp`) that must be built separately and available at the configured path
- **Development Server:** Use `npm run dev` to start Mastra dev server with playground UI and API endpoints

## GitOps Pipeline

- **GitHub Actions:** Automated builds on push to `main` branch and PRs
  - PR builds: Push `dev-<branch-name>` tags
  - Release builds: Push version tags on tag push or manual dispatch
- **Docker Hub:** Images pushed to `runpod/worker-mastra:<version>`
- **Runpod Git Pipeline:** Configure to build and deploy on push to `main` branch
