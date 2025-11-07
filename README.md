# Worker Mastra

Mastra production server running on Runpod Serverless CPU with Load Balancer support.

> **Note**: This project uses automated CI/CD workflows for building and pushing Docker images to Docker Hub.

## Features

- Mastra Hono server with weather agent and tool (no API key required for weather)
- Runpod AI SDK provider with Qwen3 support
- `/ping` health check endpoint for Runpod serverless load balancer
- Optimized Docker image (< 1.5GB)
- Non-root user security
- Production-ready build

## Build

### Local Build and Push to Docker Hub

**Prerequisites:**

- Docker installed and running
- Docker Hub credentials (for `runpod` organization)

**Steps:**

1. **Login to Docker Hub:**

   ```bash
   docker login
   ```

   Enter your Docker Hub username and password (or access token for `runpod` org)

2. **Build and push using the helper script:**

   ```bash
   ./build-and-push.sh latest
   ```

   Or specify a version:

   ```bash
   ./build-and-push.sh v1.0.0
   ```

3. **Or manually:**

   ```bash
   # Build
   docker build --platform linux/amd64 -t runpod/worker-mastra:latest .

   # Push
   docker push runpod/worker-mastra:latest
   ```

### Development Build (without push)

```bash
npm install
npm run build
docker build --platform linux/amd64 -t runpod/worker-mastra:test .
```

## Run Locally

```bash
docker run -p 8080:80 -e RUNPOD_API_KEY=your-key runpod/worker-mastra:latest
```

Test endpoints:

```bash
# Health check
curl http://localhost:8080/ping

# Weather tool
curl -X POST http://localhost:8080/api/tools/get-weather/execute \
  -H "Content-Type: application/json" \
  -d '{"data":{"location":"Berlin"}}'

# List agents
curl http://localhost:8080/api/agents
```

## GitHub Workflows

The project includes GitHub Actions workflows for automated builds:

- **dev.yml**: Builds and pushes `dev-<branch-name>` tags on PRs
- **release.yml**: Builds and pushes version tags (e.g., `v1.0.0`) on tags or manual dispatch

**Required Secrets:**

- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Your Docker Hub access token

**Optional Variables (can override defaults):**

- `DOCKERHUB_REPO`: Docker Hub repository (default: `runpod`)
- `DOCKERHUB_IMG`: Image name (default: `worker-mastra`)

**Docker Image:** `runpod/worker-mastra:<version>`

## Runpod Serverless Deployment

### Option 1: Use Pre-built Image from Docker Hub

1. Push to GitHub (workflows will build and push to Docker Hub)
2. In Runpod Console → Serverless → New Endpoint
3. Select **Import from Docker Registry**
4. Enter image URL: `runpod/worker-mastra:latest` (or specific version like `runpod/worker-mastra:v1.0.0`)
5. Select **Endpoint Type: Load Balancer**
6. Configure GPU (CPU or 16GB+ GPU)
7. Set environment variables:
   - `RUNPOD_API_KEY`: Your Runpod API key (for Qwen3 model)
   - `PORT`: 80 (default)
   - `PORT_HEALTH`: 80 (default, same as PORT)
8. Click **Create Endpoint**

### Option 2: Build and Push Locally

```bash
# Build image
docker build --platform linux/amd64 -t YOUR_DOCKERHUB_USERNAME/worker-mastra:latest .

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/worker-mastra:latest

# Then use YOUR_DOCKERHUB_USERNAME/worker-mastra:latest in Runpod
```

## API Endpoints

Once deployed, access at: `https://YOUR_ENDPOINT_ID.api.runpod.ai/`

- `GET /ping` - Health check (returns `{"status": "healthy"}`)
- `GET /api/tools` - List available tools
- `POST /api/tools/get-weather/execute` - Execute weather tool
- `GET /api/agents` - List available agents
- `POST /api/agents/weatherAgent/chat` - Chat with weather agent

## Requirements Met

- ✅ `/ping` endpoint returning `{"status": "healthy"}` with 200 status
- ✅ Server listens on `PORT` (defaults to 80)
- ✅ Server binds to `0.0.0.0` for external access
- ✅ All API routes exposed through load balancer
- ✅ Health check compatible with Runpod monitoring

## GitOps Pipeline

Configure Runpod Git pipeline to build and deploy on push to `main` branch.
