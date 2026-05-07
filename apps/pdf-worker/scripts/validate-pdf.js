#!/usr/bin/env node

/**
 * PDF Validation Script using veraPDF
 * Validates PDF files against Peecho printing requirements
 */

import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCRIPT_DIR = __dirname;
const VALIDATION_DIR = join(SCRIPT_DIR, "..", "validation-results");
const SAMPLES_DIR = join(SCRIPT_DIR, "..", "sample-booklets-do-not-commit");

// Colors for console output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function printStatus(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Execute veraPDF command and return result
 */
async function runVeraPDF(pdfFile) {
  return new Promise((resolve, reject) => {
    const args = [pdfFile, "--format", "text", "--verbose"];

    const veraPDF = spawn("verapdf", args);
    let stdout = "";
    let stderr = "";

    veraPDF.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    veraPDF.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    veraPDF.on("close", (code) => {
      resolve({ stdout, stderr, code });
    });

    veraPDF.on("error", (error) => {
      reject(error);
    });
  });
}

/**
 * Validate a single PDF file
 */
async function validatePDF(pdfFile, outputDir) {
  const filename = basename(pdfFile, ".pdf");
  const fileOutputDir = join(outputDir, filename);

  printStatus("blue", `Validating: ${pdfFile}`);

  // Create output directory
  mkdirSync(fileOutputDir, { recursive: true });

  try {
    // Run veraPDF validation
    const result = await runVeraPDF(pdfFile);

    // Save output files
    const reportPath = join(fileOutputDir, "validation-report.txt");
    const logPath = join(fileOutputDir, "validation-console.log");

    writeFileSync(reportPath, result.stdout);
    writeFileSync(logPath, result.stdout + result.stderr);

    // Determine compliance
    const reportContent = result.stdout;
    const isCompliant =
      reportContent.includes("compliant") && !reportContent.includes("FAIL");

    if (isCompliant) {
      printStatus("green", `✓ PASS: ${filename} is compliant`);
      writeFileSync(join(fileOutputDir, "status.txt"), "PASS");
    } else {
      printStatus("red", `✗ FAIL: ${filename} is not compliant`);
      writeFileSync(join(fileOutputDir, "status.txt"), "FAIL");
    }

    // Extract Peecho requirements
    await extractPechoRequirements(fileOutputDir, reportContent);

    return { filename, compliant: isCompliant };
  } catch (error) {
    printStatus("red", `Error validating ${pdfFile}: ${error.message}`);
    writeFileSync(join(fileOutputDir, "status.txt"), "ERROR");
    return { filename, compliant: false, error: error.message };
  }
}

/**
 * Extract Peecho-specific requirements from validation report
 */
async function extractPechoRequirements(outputDir, reportContent) {
  printStatus("yellow", "Checking Peecho requirements...");

  const checklist = [];

  // Check PDF/X compliance
  if (reportContent.includes("PDF/X")) {
    printStatus("green", "  ✓ PDF/X compliance found");
    checklist.push("PDF/X: YES");
  } else {
    printStatus("red", "  ✗ No PDF/X compliance detected");
    checklist.push("PDF/X: NO");
  }

  // Check font embedding
  if (reportContent.includes("font") && reportContent.includes("embedded")) {
    printStatus("green", "  ✓ Fonts are embedded");
    checklist.push("Fonts embedded: YES");
  } else {
    printStatus("yellow", "  ⚠ Font embedding status unclear");
    checklist.push("Fonts embedded: UNKNOWN");
  }

  // Check color profiles
  if (/color|profile|cmyk|rgb/i.test(reportContent)) {
    printStatus("green", "  ✓ Color information found");
    checklist.push("Color profile: YES");
  } else {
    printStatus("yellow", "  ⚠ Color profile information unclear");
    checklist.push("Color profile: UNKNOWN");
  }

  // Check page count (18-500 pages required by Peecho)
  const pageCountMatch = reportContent.match(
    /(?:page[s]?|pages?)\s*:?\s*(\d+)/i,
  );
  const pageCount = pageCountMatch ? parseInt(pageCountMatch[1]) : 0;

  if (pageCount >= 18 && pageCount <= 500) {
    printStatus(
      "green",
      `  ✓ Page count (${pageCount}) within Peecho range (18-500)`,
    );
    checklist.push(`Page count: ${pageCount} (VALID)`);
  } else if (pageCount > 0) {
    printStatus(
      "red",
      `  ✗ Page count (${pageCount}) outside Peecho range (18-500)`,
    );
    checklist.push(`Page count: ${pageCount} (INVALID)`);
  } else {
    printStatus("yellow", "  ⚠ Could not determine page count");
    checklist.push("Page count: UNKNOWN");
  }

  writeFileSync(join(outputDir, "peecho-checklist.txt"), checklist.join("\n"));
}

/**
 * Validate all PDFs in a directory
 */
async function validateDirectory(inputDir, outputDir) {
  printStatus("blue", `Validating all PDFs in: ${inputDir}`);

  if (!existsSync(inputDir)) {
    printStatus("red", `Error: Directory ${inputDir} does not exist`);
    process.exit(1);
  }

  try {
    // Find all PDF files
    const { glob } = await import("glob");
    const pdfFiles = await glob("**/*.pdf", { cwd: inputDir, absolute: true });

    if (pdfFiles.length === 0) {
      printStatus("yellow", "No PDF files found in directory");
      return;
    }

    let passCount = 0;
    const results = [];

    // Validate each PDF
    for (const pdfFile of pdfFiles) {
      const result = await validatePDF(pdfFile, outputDir);
      results.push(result);

      if (result.compliant) {
        passCount++;
      }

      console.log("---");
    }

    // Generate summary report
    generateSummary(outputDir, results, passCount);
  } catch (error) {
    printStatus("red", `Error processing directory: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Generate summary markdown report
 */
function generateSummary(outputDir, results, passCount) {
  const totalCount = results.length;
  const failCount = totalCount - passCount;
  const successRate = Math.round((passCount / totalCount) * 100);

  const summaryFile = join(outputDir, "validation-summary.md");

  let summary = `# PDF Validation Summary

**Generated:** ${new Date().toISOString()}
**Total Files:** ${totalCount}
**Passed:** ${passCount}
**Failed:** ${failCount}
**Success Rate:** ${successRate}%

## Peecho Requirements Checklist

`;

  // Add individual file results
  for (const result of results) {
    summary += `### ${result.filename}\n`;
    summary += `**Status:** ${result.compliant ? "PASS" : "FAIL"}\n`;

    if (result.error) {
      summary += `**Error:** ${result.error}\n`;
    }

    const checklistPath = join(
      outputDir,
      result.filename,
      "peecho-checklist.txt",
    );
    if (existsSync(checklistPath)) {
      const checklist = readFileSync(checklistPath, "utf8");
      summary +=
        checklist
          .split("\n")
          .map((line) => `- ${line}`)
          .join("\n") + "\n";
    }

    summary += "\n";
  }

  writeFileSync(summaryFile, summary);
  printStatus("blue", `Summary report generated: ${summaryFile}`);
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  printStatus("blue", "PDF Validation Script for Peecho Requirements");
  printStatus("blue", "================================================");

  // Create validation results directory
  mkdirSync(VALIDATION_DIR, { recursive: true });

  switch (command) {
    case "samples":
      await validateDirectory(SAMPLES_DIR, join(VALIDATION_DIR, "samples"));
      break;

    case "help":
    case "-h":
    case "--help":
      console.log(`Usage: ${process.argv[1]} [command]`);
      console.log("");
      console.log("Commands:");
      console.log(
        "  samples    Validate sample booklets in sample-booklets-do-not-commit/",
      );
      console.log("  help       Show this help message");
      console.log("");
      console.log("Examples:");
      console.log(
        `  ${process.argv[1]} samples                    # Validate all sample PDFs`,
      );
      console.log(
        `  ${process.argv[1]} /path/to/pdf/file.pdf      # Validate single PDF`,
      );
      console.log(
        `  ${process.argv[1]} /path/to/pdf/directory     # Validate all PDFs in directory`,
      );
      break;

    case undefined:
    case "":
      printStatus(
        "yellow",
        "No argument provided. Validating sample booklets...",
      );
      await validateDirectory(SAMPLES_DIR, join(VALIDATION_DIR, "samples"));
      break;

    default:
      if (existsSync(command)) {
        if (extname(command).toLowerCase() === ".pdf") {
          await validatePDF(command, join(VALIDATION_DIR, "single"));
        } else {
          await validateDirectory(command, join(VALIDATION_DIR, "custom"));
        }
      } else {
        printStatus(
          "red",
          `Error: ${command} is not a valid file or directory`,
        );
        process.exit(1);
      }
      break;
  }
}

// Run main function
main().catch((error) => {
  printStatus("red", `Fatal error: ${error.message}`);
  process.exit(1);
});
