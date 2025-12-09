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
- **Storage:** Optional PostgreSQL with PgVector extension (defaults to in-memory)
  - Global storage: `PostgresStore` from `@mastra/pg` (when DB credentials provided)
  - Agent memory: `PgVector` from `@mastra/pg` for embeddings (when DB credentials provided)
  - Falls back to in-memory storage when no database credentials are configured
- **External Tool Integration:** MCP (Model Context Protocol) via `@mastra/mcp`
  - MCP servers provide external tools to agents (e.g., RunPod API tools)
  - MCP configuration in `src/mastra/mcp-config.ts` manages server connections
- **Project Structure:**
  - `src/mastra/agents/` - Agent definitions
  - `src/mastra/tools/` - Mastra tool implementations
  - `src/mastra/utils/` - Shared utilities (db, etc.)
  - `src/mastra/index.ts` - Mastra instance configuration
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

- **Optional Database:** Storage is optional. When database credentials are not provided, the system uses in-memory storage. This allows the worker to run without a database for testing or simple use cases.

- **Centralized Database Utilities:** All database credential checking and storage creation is centralized in `src/mastra/utils/db.ts`. This utility provides:
  - `hasDbCredentials`: Boolean check for all required DB credentials
  - `createStorage()`: Creates `PostgresStore` for global Mastra storage
  - `createAgentMemory(agentName)`: Creates `Memory` with `PgVector` for agent-specific memory
  - Agents do not handle database logic directly - they import from the utility

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

### Optional (Database - for persistent storage)

- `DB_HOST`: PostgreSQL database host address
- `DB_USERNAME`: PostgreSQL database username
- `DB_NAME`: PostgreSQL database name
- `DB_PASSWORD`: PostgreSQL database password
- `DB_PORT`: PostgreSQL database port (default: `6543` for transaction pooler)

When all DB credentials are provided, PostgreSQL with PgVector is used. Otherwise, in-memory storage is used.

### Optional (Server)

- `PORT`: Server port (default: `80`)
- `PORT_HEALTH`: Health check port (default: same as `PORT`)
- `MASTRA_PORT`: Internal Mastra server port (default: `4111`)

## Agent Patterns

- **Multiple Agents:** Multiple agents can be registered in a single Mastra instance. Each agent has its own memory instance but shares the global storage provider.
- **Memory Initialization:** Agents import `createAgentMemory()` from `utils/db.ts` - they do not handle database logic themselves.
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

## RunPod Hub Integration

- **Hub Metadata:** `.runpod/` folder contains Hub publishing configuration
  - `hub.json`: Worker metadata, environment variables, and deployment config
  - `tests.json`: Automated endpoint tests for Hub validation
  - `README.md`: Hub-specific documentation displayed on the Hub page
- **Endpoint Type:** Load Balancer (`LB`) for high availability
- **Runtime:** CPU serverless (no GPU required)
- **Category:** `language` (AI/LLM category)