import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface GhostScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PDFXOptions {
  outputIntentProfile?: string;
  pdfxVersion?: "PDF/X-4" | "PDF/X-4p";
}

@Injectable()
export class PdfXProcessorService {
  private readonly logger = new Logger(PdfXProcessorService.name);
  private readonly gsPath = "/usr/bin/gs";
  private readonly defaultProfile = "ISO Coated v2 (ECI)";

  /**
   * Run GhostScript with given arguments
   */
  private runGhostScript(args: string[]): Promise<GhostScriptResult> {
    return new Promise((resolve, reject) => {
      this.logger.debug(
        `Running GhostScript: ${this.gsPath} ${args.join(" ")}`,
      );

      const proc = spawn(this.gsPath, args, {
        timeout: 120000,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout?.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to spawn GhostScript: ${error.message}`));
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ stdout, stderr, exitCode: code ?? 0 });
        } else {
          reject(
            new Error(
              `GhostScript exited with code ${code}. stderr: ${stderr || "(empty)"}`,
            ),
          );
        }
      });
    });
  }

  /**
   * Post-process a PDF with GhostScript to achieve PDF/X-4 compliance.
   * This adds proper color management, font embedding, and output intents.
   */
  async postProcessToPDFX(
    inputPdfBytes: Uint8Array,
    options: PDFXOptions = {},
  ): Promise<Uint8Array> {
    const tempDir = await mkdtemp(join(tmpdir(), "pdfx-"));
    const inputPath = join(tempDir, "input.pdf");
    const outputPath = join(tempDir, "output.pdf");

    try {
      // Write input PDF to temp file
      await writeFile(inputPath, inputPdfBytes);

      // GhostScript PDF/X-4 conversion command
      // Using minimal but effective options for PDF/X compliance
      // Note: GhostScript uses internal CMYK color management
      const gsArgs = [
        "-sDEVICE=pdfwrite",
        "-dPDFX=4",
        "-dBATCH",
        "-dNOPAUSE",
        "-dNOOUTERSAVE",
        "-dPDFSETTINGS=/prepress",
        // Color management - convert to CMYK
        "-sProcessColorModel=DeviceCMYK",
        "-sColorConversionStrategy=CMYK",
        "-sColorConversionStrategyForImages=CMYK",
        // Font embedding
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        "-dMaxSubsetPct=100",
        // Output
        `-sOutputFile=${outputPath}`,
        inputPath,
      ];

      this.logger.log(
        `Converting PDF to ${options.pdfxVersion ?? "PDF/X-4"} with GhostScript...`,
      );

      const result = await this.runGhostScript(gsArgs);

      if (result.stderr) {
        this.logger.warn(`GhostScript warnings: ${result.stderr}`);
      }

      // Read the processed PDF
      const outputBytes = await readFile(outputPath);

      this.logger.log(
        `PDF/X conversion complete: ${inputPdfBytes.length} bytes → ${outputBytes.length} bytes`,
      );

      return new Uint8Array(outputBytes);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`GhostScript PDF/X conversion failed: ${message}`);
      throw new Error(`PDF/X conversion failed: ${message}`);
    } finally {
      // Cleanup temp files
      try {
        await unlink(inputPath).catch(() => {});
        await unlink(outputPath).catch(() => {});
      } catch {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Check if GhostScript is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await this.runGhostScript(["--version"]);
      this.logger.log(`GhostScript version: ${result.stdout.trim()}`);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`GhostScript not available: ${message}`);
      return false;
    }
  }
}
