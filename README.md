# Worker Mastra

Mastra production server running on Runpod Serverless CPU with Load Balancer support.

> **Note**: This project uses automated CI/CD workflows for building and pushing Docker images to Docker Hub.

## Features

- Mastra Hono server with weather agent and tool (no API key required for weather)
- Runpod AI SDK provider with Qwen3 support
- `/ping` health check endpoint for Runpod serverless load balancer
- PostgreSQL storage with PgVector for agent memory
- Observability and telemetry enabled (Mastra Cloud)
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

## Environment Variables

### Required

- `RUNPOD_API_KEY`: Your Runpod API key for accessing Qwen3 model via AI SDK Provider
- `DB_HOST`: PostgreSQL database host address
- `DB_USERNAME`: PostgreSQL database username
- `DB_NAME`: PostgreSQL database name
- `DB_PASSWORD`: PostgreSQL database password

### Optional

- `PORT`: Server port (default: `80`)
- `PORT_HEALTH`: Health check port (default: same as `PORT`)
- `MASTRA_PORT`: Internal Mastra server port (default: `4111`)
- `DB_PORT`: PostgreSQL database port (default: `6543` for transaction pooler)

### PostgreSQL Database Setup

This project requires a PostgreSQL database with the `pgvector` extension for agent memory and storage. We recommend using **Supabase** for easy setup.

#### Using Supabase

1. Create a new project at [Supabase Dashboard](https://supabase.com/dashboard)
2. Go to **Settings** → **Database** → **Connection string**
3. Select **Transaction pooler** mode
4. Copy the connection details and set these environment variables:

```
DB_HOST=db.[PROJECT_REF].supabase.co
DB_USERNAME=postgres
DB_NAME=postgres
DB_PASSWORD=[YOUR_DATABASE_PASSWORD]
DB_PORT=6543
```

**Note:** The transaction pooler (port `6543`) is recommended for serverless deployments as it handles connection pooling efficiently. For direct connections, use port `5432`.

#### Using Other PostgreSQL Providers

For other PostgreSQL providers (AWS RDS, DigitalOcean, etc.), configure:

```
DB_HOST=[YOUR_DB_HOST]
DB_USERNAME=[YOUR_DB_USER]
DB_NAME=[YOUR_DB_NAME]
DB_PASSWORD=[YOUR_DB_PASSWORD]
DB_PORT=5432
```

Make sure your PostgreSQL database has the `pgvector` extension installed.

## Run Locally

### Option 1: Local Development with Mastra Dev (Recommended for Development)

For local development and testing, you can run Mastra directly without building a Docker image:

1. **Start PostgreSQL and pgAdmin** (if not already running):

   ```bash
   docker-compose up -d postgres pgadmin
   ```

   **Note:** If port 5432 is already in use, you can either:
   - Stop your existing PostgreSQL instance, or
   - Modify the port mapping in `docker-compose.yml` to use a different port

2. **Create a `.env` file** in the project root with your environment variables:

   ```bash
   RUNPOD_API_KEY=your-runpod-api-key-here
   DB_HOST=localhost
   DB_USERNAME=worker_mastra_user
   DB_NAME=worker_mastra
   DB_PASSWORD=worker_mastra_password
   DB_PORT=5432
   ```

3. **Install dependencies** (if not already done):

   ```bash
   npm install
   ```

4. **Start the Mastra development server:**

   ```bash
   npm run dev
   ```

   This will start:
   - 🎮 **Playground UI**: http://localhost:4111/ - Chat with your agents (weatherAgent, runpodInfraAgent)
   - 🔌 **API Endpoints**: http://localhost:4111/api - REST API for agents
   - 📚 **API Documentation**: http://localhost:4111/swagger-ui - Interactive API explorer

**Note:** Make sure the `runpod-mcp` project is built and available at `../runpod-mcp/build/index.js` for the RunPod Infra Management agent to work. If you haven't built it yet:

```bash
cd ../runpod-mcp
npm install
npm run build
```

### Option 2: Using Docker Compose (Full Stack)

This will start PostgreSQL with pgvector, pgAdmin, and worker-mastra all together:

```bash
# Set your Runpod API key (optional, defaults to 'your-key-here')
export RUNPOD_API_KEY=your-actual-key

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f worker-mastra
```

**Access points:**

- worker-mastra API: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- pgAdmin: `http://localhost:8080` (login: `admin@example.com` / `admin`)

**Stop services:**

```bash
docker-compose down
```

**Stop and remove volumes (clean slate):**

```bash
docker-compose down -v
```

### Option 3: Docker Compose (Database Only)

If you want to run worker-mastra separately:

```bash
# Start only PostgreSQL and pgAdmin
docker-compose up -d postgres pgadmin

# Start worker-mastra (in another terminal)
docker run -p 3000:80 \
  -e RUNPOD_API_KEY=your-key \
  -e DB_HOST=host.docker.internal \
  -e DB_USERNAME=worker_mastra_user \
  -e DB_NAME=worker_mastra \
  -e DB_PASSWORD=worker_mastra_password \
  runpod/worker-mastra:latest
```

**Note:** Use `host.docker.internal` as `DB_HOST` to connect from Docker container to host PostgreSQL.

### Option 4: Manual Docker Run

If you already have PostgreSQL running:

```bash
docker run -p 8080:80 \
  -e RUNPOD_API_KEY=your-key \
  -e DB_HOST=localhost \
  -e DB_USERNAME=worker_mastra_user \
  -e DB_NAME=worker_mastra \
  -e DB_PASSWORD=worker_mastra_password \
  runpod/worker-mastra:latest
```

**Note:** Make sure you have a PostgreSQL database running and accessible at `DB_HOST` before starting the container.

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
   - **Required:**
     - `RUNPOD_API_KEY`: Your Runpod API key (for Qwen3 model)
     - `DB_HOST`: PostgreSQL database host
     - `DB_USERNAME`: PostgreSQL database username
     - `DB_NAME`: PostgreSQL database name
     - `DB_PASSWORD`: PostgreSQL database password
   - **Optional:**
     - `PORT`: Server port (default: 80)
     - `PORT_HEALTH`: Health check port (default: same as PORT)
     - `MASTRA_PORT`: Internal Mastra server port (default: 4111)
     - `DB_PORT`: PostgreSQL database port (default: 6543 for transaction pooler)
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
