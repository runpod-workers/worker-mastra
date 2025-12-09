![Mastra AI Agent Server](https://mastra.ai/favicon.ico)

Deploy AI agents powered by [Mastra](https://mastra.ai) with OpenAI-compatible endpoints

---

[![Runpod](https://api.runpod.io/badge/runpod-workers/worker-mastra)](https://www.runpod.io/console/hub/runpod-workers/worker-mastra)

---

## Endpoint Configuration

All behaviour is controlled through environment variables:

| Environment Variable | Description                          | Default | Required |
| -------------------- | ------------------------------------ | ------- | -------- |
| `RUNPOD_API_KEY`     | Runpod API key for AI model access   |         | Yes      |
| `DB_HOST`            | PostgreSQL database host             |         | No       |
| `DB_USERNAME`        | PostgreSQL database username         |         | No       |
| `DB_NAME`            | PostgreSQL database name             |         | No       |
| `DB_PASSWORD`        | PostgreSQL database password         |         | No       |
| `DB_PORT`            | PostgreSQL database port             | 6543    | No       |
| `PORT`               | Server port                          | 80      | No       |
| `MASTRA_PORT`        | Internal Mastra server port          | 4111    | No       |

## Database Setup (Optional)

Database is optional. Without database credentials, the worker uses in-memory storage (no persistent memory between requests).

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
{"status": "healthy"}
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
curl -X POST https://YOUR_ENDPOINT_ID.api.runpod.ai/api/agents/weatherAgent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather in San Francisco?"}
    ]
  }'
```

## Features

- Mastra AI framework with multi-agent support
- Runpod AI SDK provider with OpenAI GPT-OSS-120B
- PostgreSQL storage with PgVector for agent memory
- `/ping` health check for load balancer monitoring
- OpenAI-compatible chat API

## Architecture

- **Runtime:** CPU (serverless)
- **Endpoint Type:** Load Balancer (LB)
- **Framework:** Mastra + Hono server
- **Storage:** PostgreSQL with pgvector extension

## Documentation

- [Mastra Documentation](https://mastra.ai/docs)
- [Runpod Serverless Documentation](https://docs.runpod.io/serverless)

