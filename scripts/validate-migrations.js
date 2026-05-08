#!/usr/bin/env node
/**
 * Pre-commit validation for Prisma migrations
 * Prevents common migration issues before they reach production
 */

import { readdirSync, statSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Find git root to ensure paths work regardless of where script is invoked from
const GIT_ROOT = execSync("git rev-parse --show-toplevel", {
  encoding: "utf-8",
}).trim();
const MIGRATIONS_DIR = join(GIT_ROOT, "apps/mvp/prisma/migrations");
const VALID_TIMESTAMP_REGEX = /^20\d{12}_/; // YYYYMMDDHHMMSS_

function validateMigrations() {
  const entries = readdirSync(MIGRATIONS_DIR, { withFileTypes: true });
  const migrationDirs = entries
    .filter((e) => e.isDirectory() && e.name !== "migration_lock.toml")
    .map((e) => e.name)
    .sort();

  let hasErrors = false;

  for (const dir of migrationDirs) {
    // Check timestamp format
    if (!VALID_TIMESTAMP_REGEX.test(dir)) {
      console.error(`❌ Invalid migration timestamp: ${dir}`);
      console.error(
        "   Migration names must use format: YYYYMMDDHHMMSS_description",
      );
      hasErrors = true;
    }

    // Check migration.sql exists and is valid SQL
    const migrationPath = join(MIGRATIONS_DIR, dir, "migration.sql");
    try {
      const content = readFileSync(migrationPath, "utf-8");

      // Check for CLI error output (common copy-paste mistake)
      if (
        content.includes("npm warn") ||
        content.includes("Error:") ||
        content.includes("Usage") ||
        content.includes("$ prisma")
      ) {
        console.error(
          `❌ Migration ${dir} contains CLI error output instead of SQL`,
        );
        hasErrors = true;
      }

      // Check for basic SQL content
      const hasSqlContent = /CREATE|ALTER|DROP|INSERT|UPDATE|DELETE/i.test(
        content,
      );
      if (!hasSqlContent && content.trim().length > 0) {
        console.error(`⚠️  Migration ${dir} may lack valid SQL statements`);
      }
    } catch (err) {
      console.error(`❌ Missing migration.sql in ${dir}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error(
      "\nMigration validation failed. Fix issues before committing.",
    );
    process.exit(1);
  }

  console.log("✅ Migration validation passed");
  process.exit(0);
}

validateMigrations();
