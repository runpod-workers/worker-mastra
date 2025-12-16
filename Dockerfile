# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build Mastra application
RUN npm run build

# Production stage  
FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --only=production --legacy-peer-deps && npm cache clean --force

# Copy built output from builder
COPY --from=builder /app/.mastra ./.mastra

# Copy ingestion script for RAG (users run this to populate vector store)
COPY --from=builder /app/scripts ./scripts

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S mastra -u 1001 && \
    chown -R mastra:nodejs /app

USER mastra

# Expose port (default 80, configurable via PORT)
EXPOSE 80

# Environment variables (defaults to 80, can be overridden)
ENV PORT=80
ENV PORT_HEALTH=80
ENV MASTRA_PORT=4111
ENV NODE_ENV=production

# Copy server wrapper (from builder since it's in source)
COPY --from=builder /app/server-entry.mjs ./

# Run wrapper server (adds /ping and proxies to Mastra)
CMD ["node", "server-entry.mjs"]
