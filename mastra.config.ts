import { defineConfig } from "mastra/config";

export default defineConfig({
  server: {
    port: parseInt(process.env.MASTRA_PORT || "4111"),
  },
});
