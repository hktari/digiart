#!/usr/bin/env node
const { config } = require("dotenv");
const { resolve } = require("node:path");
const { spawn } = require("node:child_process");
const { existsSync, readFileSync, unlinkSync } = require("node:fs");

config({ path: resolve(__dirname, "../.env.test") });
config({ path: resolve(__dirname, "../.env.test.local") });

const child = spawn("pnpm", ["next", "dev", "--port", "3003"], {
  stdio: "inherit",
  env: { ...process.env, PORT: "3003" },
});

child.on("exit", (code) => {
  process.exit(code);
});
