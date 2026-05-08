#!/usr/bin/env node
/**
 * Pre-commit hook to prevent modification of existing migration files.
 *
 * PRODUCTION SAFETY RULE: Migration files are immutable once committed.
 * If you need to change the database schema, create a NEW migration instead:
 *
 *   cd apps/mvp && pnpm prisma migrate dev --name your_change_description
 *
 * This ensures production environments can safely run:
 *   pnpm prisma migrate deploy
 */

import { execSync } from "child_process";
import { basename } from "path";

function checkMigrationModifications() {
  try {
    // Find git root to ensure commands work from any subdirectory
    const gitRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
    const gitOpts = { encoding: "utf-8", cwd: gitRoot };

    // Get list of staged files
    const stagedFiles = execSync("git diff --cached --name-only", gitOpts)
      .trim()
      .split("\n")
      .filter(Boolean);

    // Find modified migration files (not new ones)
    const migrationModifications = stagedFiles.filter((file) => {
      // Only check files in migrations directory
      if (!file.includes("prisma/migrations/")) return false;
      // Ignore the lock file
      if (file.includes("migration_lock.toml")) return false;
      // Check if this is a modification to an existing file (not a new addition)
      try {
        const status = execSync(`git status --porcelain "${file}"`, gitOpts);
        // Status codes: M = modified, A = added, D = deleted, ?? = untracked
        // We only care about modifications (M) not additions (A)
        return status.startsWith("M") || status.startsWith(" D");
      } catch {
        return false;
      }
    });

    if (migrationModifications.length > 0) {
      console.error("");
      console.error(
        "╔══════════════════════════════════════════════════════════════════════════╗",
      );
      console.error(
        "║                    🚫 MIGRATION MODIFICATION BLOCKED                     ║",
      );
      console.error(
        "╠══════════════════════════════════════════════════════════════════════════╣",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║  Existing migration files cannot be modified. They are immutable       ║",
      );
      console.error(
        "║  once committed to ensure production database consistency.                 ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║  Modified migration files detected:                                      ║",
      );
      migrationModifications.forEach((file) => {
        const displayName = file.length > 55 ? "..." + file.slice(-52) : file;
        console.error(`║    • ${displayName.padEnd(65)}║`);
      });
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "╠══════════════════════════════════════════════════════════════════════════╣",
      );
      console.error(
        "║  ✅ WHAT TO DO INSTEAD:                                                  ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║  Create a NEW migration to make your schema changes:                     ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║    cd apps/mvp && pnpm prisma migrate dev --name describe_your_change    ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║  This allows production to safely run:                                   ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "║    pnpm prisma migrate deploy                                            ║",
      );
      console.error(
        "║                                                                          ║",
      );
      console.error(
        "╚══════════════════════════════════════════════════════════════════════════╝",
      );
      console.error("");

      // Provide git commands to help recover
      console.error("To undo your migration changes and start fresh:");
      console.error("");
      migrationModifications.forEach((file) => {
        console.error(`  git checkout -- "${file}"`);
      });
      console.error("");

      process.exit(1);
    }

    return true;
  } catch (error) {
    if (error.status === 1) {
      // Our intentional exit, re-throw
      throw error;
    }
    console.error("Error checking migration files:", error.message);
    process.exit(1);
  }
}

checkMigrationModifications();
console.log("✅ No existing migration files were modified");
process.exit(0);
