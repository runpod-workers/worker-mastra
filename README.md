# Mastra Serverless CPU Deployment

Mastra production server running on Runpod Serverless CPU with Load Balancer support.

## Features

- Mastra Hono server with weather tool (no API key required)
- `/ping` health check endpoint for Runpod serverless
- Optimized Docker image (< 1.5GB)
- Non-root user security
- Production-ready build

## Build

```bash
npm install
npm run build
docker build -t mastra-serverless-cpu .
```

## Run Locally

```bash
docker run -p 8080:80 mastra-serverless-cpu
```

Test health endpoint:

```bash
curl http://localhost:8080/ping
```

## Runpod Deployment

Configure Runpod serverless endpoint with:

- Container image: `mastra-serverless-cpu`
- Port: `80`
- Health check endpoint: `/ping`

## GitOps Pipeline

Configure Runpod Git pipeline to build and deploy on push to `main` branch.
