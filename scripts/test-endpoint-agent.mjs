#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

const ENDPOINT_URL =
  process.env.ENDPOINT_URL || process.env.RUNPOD_ENDPOINT_URL;
const API_KEY = process.env.RUNPOD_API_KEY || process.env.API_KEY;

if (!ENDPOINT_URL) {
  console.error(
    "❌ Error: ENDPOINT_URL or RUNPOD_ENDPOINT_URL not set in .env"
  );
  process.exit(1);
}

if (!API_KEY) {
  console.error("❌ Error: RUNPOD_API_KEY or API_KEY not set in .env");
  process.exit(1);
}

const question = process.argv[2] || "What's the weather in New York?";

async function testAgent() {
  console.log(`🌐 Endpoint: ${ENDPOINT_URL}`);
  console.log(`💬 Question: ${question}\n`);

  try {
    const response = await fetch(
      `${ENDPOINT_URL}/api/agents/weatherAgent/generate`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: question,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();
    console.log("✅ Response:");
    console.log(JSON.stringify(data, null, 2));

    // If response has text, show it nicely
    if (data.text) {
      console.log("\n📝 Agent Response:");
      console.log(data.text);
    }
  } catch (error) {
    console.error("❌ Request failed:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testAgent();
