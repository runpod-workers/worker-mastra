// Entrypoint that wraps Mastra server to add /ping endpoint
import { createServer } from "http";
import { request } from "http";

const port = parseInt(process.env.PORT || "80");
const mastraPort = parseInt(process.env.MASTRA_PORT || "4111");

// Set PORT to MASTRA_PORT before importing Mastra (Mastra reads PORT env var)
process.env.PORT = mastraPort.toString();

// Import Mastra - this starts the server on mastraPort
await import("./.mastra/output/index.mjs");

// Wait a bit for Mastra to start
await new Promise((resolve) => setTimeout(resolve, 2000));

// Create wrapper server that handles /ping and proxies rest to Mastra
const server = createServer((req, res) => {
  // Handle /ping endpoint for Runpod health checks
  if (req.url === "/ping") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Proxy all other requests to Mastra server
  const proxyReq = request(
    {
      hostname: "localhost",
      port: mastraPort,
      path: req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );

  req.pipe(proxyReq);

  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Bad Gateway" }));
    }
  });
});

server.listen(port, () => {
  console.log(
    `Server wrapper running on port ${port}, proxying to Mastra on ${mastraPort}`
  );
});
