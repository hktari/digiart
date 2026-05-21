#!/usr/bin/env tsx
import "dotenv/config";

async function main() {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) {
    console.error("FIREWORKS_API_KEY not found in .env");
    process.exit(1);
  }

  const response = await fetch("https://api.fireworks.ai/inference/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    console.error(`HTTP ${response.status}: ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    process.exit(1);
  }

  const data = await response.json();
  console.log(
    JSON.stringify(
      data.data.map((m: any) => m.id),
      null,
      2,
    ),
  );
}

main();
