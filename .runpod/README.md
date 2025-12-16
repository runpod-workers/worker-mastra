![Mastra AI Agent Server](https://mastra.ai/favicon.ico)

Deploy AI agents powered by [Mastra](https://mastra.ai) on Runpod Serverless

---

[![Runpod](https://api.runpod.io/badge/runpod-workers/worker-mastra)](https://www.runpod.io/console/hub/runpod-workers/worker-mastra)

---

## Experimental

This worker is **experimental** and designed to explore running AI agents on Runpod Serverless CPU endpoints.

### Current Limitations

**Cold Start Time:** CPU pods currently have a cold start time of 20-40 seconds. We are actively working on bringing **Flash Boot** to CPU pods (currently available for GPU pods) to enable instant startups.

**Load Balancer:** This worker uses the experimental Load Balancer endpoint type to expose Mastra's HTTP API directly, without requiring the Runpod Python SDK.

### Recommended Configuration

To avoid cold start delays, we recommend setting **Active Workers to 1** in your endpoint configuration. This keeps one worker always running and ready to handle requests immediately.

## Storage and Memory

The worker supports three storage modes for agent memory:

**Ephemeral (Default):** Without database credentials and no network volume, the worker uses LibSQL (SQLite) file storage at `/tmp/mastra-storage.db`. This data is **lost when the worker stops**.

**Network Volume (Persistent):** Attach a network volume to the endpoint. The worker automatically detects `/runpod-volume` and stores data at `/runpod-volume/mastra-storage.db`, surviving worker restarts.

**PostgreSQL (Persistent):** Configure a PostgreSQL database with the `pgvector` extension for full-featured persistent agent memory with vector embeddings.

## Endpoint Configuration

All behaviour is controlled through environment variables:

| Environment Variable | Description                        | Default | Required |
| -------------------- | ---------------------------------- | ------- | -------- |
| `RUNPOD_API_KEY`     | Runpod API key for AI model access |         | Yes      |
| `DB_HOST`            | PostgreSQL database host           |         | No       |
| `DB_USERNAME`        | PostgreSQL database username       |         | No       |
| `DB_NAME`            | PostgreSQL database name           |         | No       |
| `DB_PASSWORD`        | PostgreSQL database password       |         | No       |
| `DB_PORT`            | PostgreSQL database port           | 6543    | No       |
| `PORT`               | Server port                        | 80      | No       |
| `MASTRA_PORT`        | Internal Mastra server port        | 4111    | No       |

## Database Setup (Optional)

For persistent agent memory, configure a PostgreSQL database with the `pgvector` extension. We recommend **Supabase** for easy setup:

1. Create a new project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Settings** > **Database** > **Connection string**
3. Select **Transaction pooler** mode (recommended for serverless)
4. Use the connection details for your environment variables

## API Usage

### Health Check

```bash
curl https://YOUR_ENDPOINT_ID.api.runpod.ai/ping
```

Response:

```json
{ "status": "healthy" }
```

### List Available Agents

```bash
curl https://YOUR_ENDPOINT_ID.api.runpod.ai/api/agents
```

### List Available Tools

```bash
curl https://YOUR_ENDPOINT_ID.api.runpod.ai/api/tools
```

### Execute Weather Tool

```bash
curl -X POST https://YOUR_ENDPOINT_ID.api.runpod.ai/api/tools/get-weather/execute \
  -H "Content-Type: application/json" \
  -d '{"data": {"location": "Berlin"}}'
```

### Chat with Weather Agent

```bash
curl -X POST https://YOUR_ENDPOINT_ID.api.runpod.ai/api/agents/weatherAgent/generate \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather in San Francisco?"}
    ]
  }'
```

## Features

- Mastra AI framework with multi-agent support
- Runpod AI SDK provider with Qwen3-32B model
- PostgreSQL storage with PgVector for agent memory (optional)
- `/ping` health check for load balancer monitoring

## Architecture

- **Runtime:** CPU (serverless)
- **Endpoint Type:** Load Balancer (experimental)
- **Framework:** Mastra + Hono server
- **Storage:** In-memory (default) or PostgreSQL with pgvector

## Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [Runpod Serverless Documentation](https://docs.runpod.io/serverless)
