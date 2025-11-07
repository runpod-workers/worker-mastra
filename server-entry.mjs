// Entrypoint that wraps Mastra server to add /ping endpoint
import { createServer } from "http";
import { request } from "http";

const port = parseInt(process.env.PORT || "80");
const portHealth = parseInt(process.env.PORT_HEALTH || port.toString());
const mastraPort = parseInt(process.env.MASTRA_PORT || "4111");

// Set PORT to MASTRA_PORT before importing Mastra (Mastra reads PORT env var)
process.env.PORT = mastraPort.toString();

// Track initialization state - start as initializing (204 during init)
let isInitializing = true;

console.log(`[INIT] Starting server wrapper...`);
console.log(
  `[INIT] PORT=${port}, PORT_HEALTH=${portHealth}, MASTRA_PORT=${mastraPort}`
);
console.log(
  `[INIT] All environment variables:`,
  JSON.stringify(
    {
      PORT: process.env.PORT,
      PORT_HEALTH: process.env.PORT_HEALTH,
      MASTRA_PORT: process.env.MASTRA_PORT,
    },
    null,
    2
  )
);

// Start Mastra server in background
console.log(`[MASTRA] Importing Mastra server...`);
console.log(`[MASTRA] Mastra will start its HTTP server on port ${mastraPort}`);
console.log(`[MASTRA] Mastra logs will appear below (stdout/stderr)...`);

import("./.mastra/output/index.mjs")
  .then(() => {
    console.log("[MASTRA] ✓ Mastra server module imported successfully");
    console.log(
      "[MASTRA] ✓ Mastra HTTP server should be starting on port",
      mastraPort
    );
    // Mark as ready immediately - Mastra will start its server during import
    // Mastra logs will appear in stdout/stderr automatically
    isInitializing = false;
    console.log("[MASTRA] ✓ Mastra import complete, /ping will return 200");
  })
  .catch((err) => {
    console.error("[MASTRA] ❌ Failed to import Mastra:", err);
    console.error("[MASTRA] ❌ Error stack:", err.stack);
    // Keep initializing forever if Mastra fails (worker will be unhealthy)
  });

// Note: Mastra's own logs (from its HTTP server) will appear in stdout/stderr
// We mark as ready immediately after import - Mastra starts its server during import

// Create wrapper server that handles /ping and proxies rest to Mastra
const server = createServer((req, res) => {
  const startTime = Date.now();
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  console.log(`[REQUEST] Headers:`, JSON.stringify(req.headers, null, 2));

  // Handle /ping endpoint for Runpod health checks
  if (req.url === "/ping") {
    console.log(
      `[PING] Health check requested, isInitializing=${isInitializing}`
    );
    if (isInitializing) {
      // Still initializing - return 204 (Runpod expects this during cold start)
      console.log(`[PING] Returning 204 No Content (initializing)`);
      res.writeHead(204);
      res.end();
    } else {
      // Ready - return 200 with JSON body (matches FastAPI example)
      console.log(`[PING] Returning 200 OK`);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "healthy" }));
    }
    console.log(`[PING] Response sent in ${Date.now() - startTime}ms`);
    return;
  }

  // Proxy all other requests to Mastra server
  console.log(
    `[PROXY] Proxying ${req.method} ${req.url} to localhost:${mastraPort}${req.url}`
  );
  const proxyReq = request(
    {
      hostname: "localhost",
      port: mastraPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      console.log(
        `[PROXY] Got response from Mastra: ${proxyRes.statusCode} ${proxyRes.statusMessage}`
      );
      console.log(
        `[PROXY] Response headers:`,
        JSON.stringify(proxyRes.headers, null, 2)
      );
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
      proxyRes.on("end", () => {
        console.log(
          `[PROXY] Response completed in ${Date.now() - startTime}ms`
        );
      });
    }
  );

  req.pipe(proxyReq);

  proxyReq.on("error", (err) => {
    console.error(`[PROXY] Error proxying to Mastra:`, err.message);
    console.error(`[PROXY] Error stack:`, err.stack);
    if (!res.headersSent) {
      console.log(`[PROXY] Returning 502 Bad Gateway`);
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad Gateway", message: err.message }));
    }
  });

  req.on("data", (chunk) => {
    console.log(`[PROXY] Received ${chunk.length} bytes of request data`);
  });

  req.on("end", () => {
    console.log(`[PROXY] Request body complete`);
  });
});

server.listen(port, "0.0.0.0", () => {
  const addr = server.address();
  console.log(
    `[SERVER] ✓ Server wrapper listening on ${addr.address}:${addr.port}`
  );
  console.log(`[SERVER] ✓ Ready to proxy to Mastra on port ${mastraPort}`);
  console.log(`[SERVER] ✓ Health check endpoint: http://0.0.0.0:${port}/ping`);
  console.log(
    `[SERVER] ✓ PORT_HEALTH=${portHealth}, health checks should use port ${portHealth}`
  );
  console.log(`[SERVER] ✓ If PORT_HEALTH != PORT, health checks may fail!`);
  console.log(`[SERVER] ✓ Waiting for incoming requests...`);
});

// Log when server is actually ready to accept connections
server.on("connection", (socket) => {
  console.log(
    `[SERVER] ✓ New connection from ${socket.remoteAddress}:${socket.remotePort}`
  );
  socket.on("error", (err) => {
    console.error(`[SERVER] Socket error:`, err.message);
  });
});

server.on("error", (err) => {
  console.error(`[SERVER] Server error:`, err.message);
  console.error(`[SERVER] Error stack:`, err.stack);
});

// Also log when server starts listening
server.on("listening", () => {
  const addr = server.address();
  console.log(`[SERVER] ✓ Server listening on ${addr.address}:${addr.port}`);
  console.log(
    `[SERVER] ✓ Health checks should hit: http://0.0.0.0:${port}/ping`
  );
});
