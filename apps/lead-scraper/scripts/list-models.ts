#!/usr/bin/env tsx
import "dotenv/config";

async function listModels() {
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
    process.exit(1);
  }

  const data = await response.json();

  console.log(`Total models: ${data.data.length}\n`);

  // Show all models with "llama" in the name
  console.log("All models with 'llama':");
  data.data
    .filter((m: any) => m.id.toLowerCase().includes("llama"))
    .forEach((m: any) => console.log(`  ${m.id}`));

  console.log("\nAll models with '70b':");
  data.data
    .filter((m: any) => m.id.includes("70b"))
    .forEach((m: any) => console.log(`  ${m.id}`));

  console.log("\nFirst 10 chat models:");
  data.data
    .filter((m: any) => m.id.includes("chat") || m.id.includes("instruct"))
    .slice(0, 10)
    .forEach((m: any) => console.log(`  ${m.id}`));
}

listModels();
