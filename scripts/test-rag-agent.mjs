/**
 * Test script for the Docs RAG Agent
 * 
 * Tests the agent's ability to answer questions about Runpod documentation
 * using the vector store populated by ingest-docs.ts
 */

const ENDPOINT_URL = process.env.ENDPOINT_URL || "http://localhost:4111";

async function testRagAgent(question) {
  console.log(`\n--- Question: ${question} ---\n`);
  
  try {
    const response = await fetch(`${ENDPOINT_URL}/api/agents/docsRagAgent/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: question }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log("Response:", result.text || JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Failed to connect to server:", error.message);
    console.log("\nMake sure the server is running:");
    console.log("  cd /Users/timpietrusky/data/dev/runpod/worker-mastra");
    console.log("  node --import=./.mastra/output/instrumentation.mjs .mastra/output/index.mjs");
  }
}

async function main() {
  console.log("=== Docs RAG Agent Test ===");
  console.log(`Endpoint: ${ENDPOINT_URL}`);

  // Test questions about Runpod
  const questions = [
    "How do I create a serverless endpoint?",
    "What is a network volume and how do I use it?",
    "How do I deploy a custom worker?",
  ];

  for (const question of questions) {
    await testRagAgent(question);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

main();

