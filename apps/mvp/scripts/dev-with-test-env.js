#!/usr/bin/env node
const { config } = require("dotenv");
const { resolve } = require("path");
const { spawn } = require("child_process");

config({ path: resolve(__dirname, "../.env.test") });
config({ path: resolve(__dirname, "../.env.test.local") });

const child = spawn("pnpm", ["next", "dev", "--port", "3005"], {
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code);
});
