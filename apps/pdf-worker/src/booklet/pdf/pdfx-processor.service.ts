import { Injectable, Logger } from "@nestjs/common";
import { spawn } from "node:child_process";
import { writeFile, readFile, unlink, mkdtemp, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface GhostScriptResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PDFXOptions {
  outputIntentProfile?: string;
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
   * Post-process a PDF with GhostScript to achieve PDF/X-3 compliance (CMYK + FOGRA39 output intent).
   * PDF/X-3 is the highest version reliably producible by GhostScript pdfwrite.
   */
  async postProcessToPDFX(
    inputPdfBytes: Uint8Array,
    options: PDFXOptions = {},
  ): Promise<Uint8Array> {
    const tempDir = await mkdtemp(join(tmpdir(), "pdfx-"));
    const inputPath = join(tempDir, "input.pdf");
    const outputPath = join(tempDir, "output.pdf");

    const prefixPath = join(tempDir, "pdfx-prefix.ps");
    try {
      // Write input PDF to temp file
      await writeFile(inputPath, inputPdfBytes);

      // Resolve ICC profile path — bundled FOGRA39
      const iccProfilePath = join(process.cwd(), "profiles", "FOGRA39.icc");

      // GhostScript requires a PostScript prefix file to embed the PDF/X OutputIntent.
      // This follows the official PDFX_def.ps pattern bundled with GhostScript.
      // -dNOSAFER is required so the prefix PS can open the ICC file from disk.
      const prefixContent = `%!
% PDF/X-3 output intent — FOGRA39 / ISO Coated v2
% Based on GhostScript's PDFX_def.ps template

[ /GTS_PDFXVersion (PDF/X-3:2002)
  /Trapped /False
/DOCINFO pdfmark

/ICCProfile (${iccProfilePath}) def

currentdict /ICCProfile known {
  [/_objdef {icc_PDFX} /type /stream /OBJ pdfmark
  [{icc_PDFX} << /N 4 >> /PUT pdfmark
  [{icc_PDFX} ICCProfile (r) file /PUT pdfmark
} if

[/_objdef {OutputIntent_PDFX} /type /dict /OBJ pdfmark
[{OutputIntent_PDFX} <<
  /Type /OutputIntent
  /S /GTS_PDFX
  /OutputCondition (FOGRA39)
  /OutputConditionIdentifier (FOGRA39)
  /RegistryName (http://www.color.org)
  /Info (ISO Coated v2 \\(ECI\\))
  currentdict /ICCProfile known { /DestOutputProfile {icc_PDFX} } if
>> /PUT pdfmark
[{Catalog} <</OutputIntents [ {OutputIntent_PDFX} ]>> /PUT pdfmark
`;
      await writeFile(prefixPath, prefixContent);

      // GhostScript PDF/X-3 conversion command
      // -dNOSAFER: required so the PS prefix file can read the ICC profile from disk
      // -dPDFX: produces PDF/X-3:2002 (highest version reliably supported by pdfwrite)
      const gsArgs = [
        "-sDEVICE=pdfwrite",
        "-dPDFX",
        "-dBATCH",
        "-dNOPAUSE",
        "-dNOOUTERSAVE",
        "-dNOSAFER",
        "-dPDFSETTINGS=/prepress",
        // Color management - convert to CMYK
        "-sProcessColorModel=DeviceCMYK",
        "-sColorConversionStrategy=CMYK",
        "-sColorConversionStrategyForImages=CMYK",
        // Flatten transparency (required for PDF/X)
        "-dHaveTransparency=false",
        // Font embedding
        "-dEmbedAllFonts=true",
        "-dSubsetFonts=true",
        "-dMaxSubsetPct=100",
        // Output
        `-sOutputFile=${outputPath}`,
        // Prefix file must come before the input PDF
        prefixPath,
        inputPath,
      ];

      this.logger.log(
        `Converting PDF to PDF/X-3 (CMYK/FOGRA39) with GhostScript...`,
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
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      await unlink(prefixPath).catch(() => {});
      await rmdir(tempDir).catch(() => {});
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
