# Collection → print consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a `Collection` printable through the same booklet pipeline that
serves subscription cycles, and fix the resolution gate so it measures the page
the renderer actually draws.

**Architecture:** Extract the plate-placement maths into a shared workspace
package so the renderer and the resolution gate are literally the same function.
Invert the job payload so callers resolve artwork and the worker only builds —
one worker path, two callers (cycles and collections). Grade plates on a tiered
dpi scale and skip rejects instead of failing the job.

**Tech Stack:** TypeScript, pnpm workspaces, NestJS + BullMQ (pdf-worker, Jest),
Next.js 16 App Router + Prisma (mvp, Vitest), pdf-lib, Ghostscript.

**Spec:** [`docs/superpowers/specs/2026-07-31-collect-print-consolidation-design.md`](../specs/2026-07-31-collect-print-consolidation-design.md)

## Global Constraints

- Package manager is **pnpm**. Never npm/yarn.
- Format and lint with **Biome**, 2-space indent: `pnpm --filter <app> lint:format`.
- `pdf-worker` tests are **Jest**; `mvp` tests are **Vitest**. Do not mix.
- **`biome.json` in pdf-worker disables `style/useImportType` for `src/**`.** Injected
  Nest dependencies must stay value imports or the app crashes at bootstrap. Do not
  narrow that override.
- Committed Prisma migrations are **immutable** — `scripts/prevent-migration-modification.js`
  blocks edits. Schema changes require a NEW migration via
  `pnpm --filter mvp db:migrate --name <name>`.
- Pre-commit runs lint-staged + mvp typecheck. In a fresh worktree run
  `cd apps/mvp && npx prisma generate` once, or the typecheck fails on missing
  `@prisma/client` exports.
- The pre-commit hook triggers a root `pnpm install` that rewrites `pnpm-lock.yaml`.
  After each commit, run `git checkout -- pnpm-lock.yaml` unless the lockfile change
  is intentional (Task 1 is the one place it is).
- Tailwind palette: beige, fuchsia, ocean, jade. Always semantic colour tokens
  (`bg-background`, `text-muted-foreground`, …) so dark mode works.
- Tiered floor values, exact: `PRINT_DPI_FLOOR = 250`, `PRINT_DPI_WARN = 200`.
- Page geometry values, exact and already in the codebase: `MARGIN_PT = 28.35`,
  `CAPTION_BAND_PT = 16`, `MM_TO_PT = 2.8346`.

---

## File Structure

**Created**
- `packages/print-geometry/package.json` — workspace package manifest.
- `packages/print-geometry/tsconfig.json` — extends `tsconfig.base.json`, emits CJS + types.
- `packages/print-geometry/src/index.ts` — public surface (re-exports).
- `packages/print-geometry/src/page.ts` — `PageFormat`, `PAGE_DIMENSIONS`, `MARGIN_PT`, `CAPTION_BAND_PT`.
- `packages/print-geometry/src/layout.ts` — `layoutPlate`, `orientationFromPixels`. The single source of plate placement.
- `packages/print-geometry/src/grade.ts` — `plateDpi`, `gradePlate`, the two dpi constants.
- `packages/print-geometry/src/__tests__/layout.test.ts`, `grade.test.ts` — Vitest.
- `apps/mvp/lib/collect/print-service.ts` — collection → `GeneratedPrintFile` + enqueued job.
- `apps/mvp/lib/collect/__tests__/print-service.test.ts`
- `apps/mvp/components/collect/print-readiness.tsx` — the collector-facing tier readout.

**Modified**
- `pnpm-workspace.yaml` — add `packages/*`.
- `Dockerfile.pdf-worker` — copy and build the new package.
- `apps/pdf-worker/src/booklet/booklet.types.ts` — re-export from the package; delete `MIN_WIDTH_PX`/`MIN_HEIGHT_PX`; new `BookletJobData`/`BookletJobResult`.
- `apps/pdf-worker/src/booklet/pdf/artwork-page.service.ts` — consume `layoutPlate`.
- `apps/pdf-worker/src/booklet/booklet.processor.ts` — grade + skip; build from payload; key on `printFileId`.
- `apps/pdf-worker/scripts/build-demo-booklet.cts` — grade instead of hard floor; emit a tier manifest.
- `apps/mvp/prisma/schema.prisma` — `GeneratedPrintFile` keying.
- `apps/mvp/lib/billing/pdf-trigger-service.ts` — resolve artwork, send self-contained payload.
- `apps/mvp/app/c/[token]/print/page.tsx` — render the readiness readout.

---

### Task 1: The `print-geometry` package

Creates the shared maths and wires it into the workspace and the Docker build in
one commit, so the tree is never left with a package the production image cannot
see.

**Files:**
- Create: `packages/print-geometry/{package.json,tsconfig.json,vitest.config.ts}`
- Create: `packages/print-geometry/src/{index.ts,page.ts,layout.ts,grade.ts}`
- Create: `packages/print-geometry/src/__tests__/{layout.test.ts,grade.test.ts}`
- Modify: `pnpm-workspace.yaml`
- Modify: `Dockerfile.pdf-worker`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type PageFormat = "A5_PORTRAIT" | "A5_LANDSCAPE" | "A4_PORTRAIT" | "A4_LANDSCAPE" | "SQUARE_210" | "SQUARE_148" | "LETTER"`
  - `interface PageDimensions { widthPt: number; heightPt: number }`
  - `const PAGE_DIMENSIONS: Record<PageFormat, PageDimensions>`
  - `const DEFAULT_PAGE_FORMAT: PageFormat`
  - `const MARGIN_PT: number`, `const CAPTION_BAND_PT: number`
  - `function orientationFromPixels(width: number, height: number): "PORTRAIT" | "LANDSCAPE"`
  - `interface PlateLayout { needsRotation: boolean; scale: number; drawW: number; drawH: number; drawX: number; drawY: number }`
  - `function layoutPlate(input: PlateInput): PlateLayout`
  - `interface PlateInput { imageWidthPx: number; imageHeightPx: number; orientation: string; page: PageDimensions; hasCaption: boolean }`
  - `function plateDpi(input: PlateInput): number`
  - `type PlateGrade = "OK" | "MARGINAL" | "REJECT"`
  - `function gradePlate(input: PlateInput): PlateGrade`
  - `const PRINT_DPI_FLOOR = 250`, `const PRINT_DPI_WARN = 200`

- [ ] **Step 1: Add `packages/*` to the workspace**

In `pnpm-workspace.yaml`, change the `packages:` list to:

```yaml
packages:
  - apps/*
  - packages/*
```

- [ ] **Step 2: Create the package manifest**

`packages/print-geometry/package.json`:

```json
{
  "name": "@printfeed/print-geometry",
  "version": "0.0.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "lint:format": "biome check --staged --fix --no-errors-on-unmatched"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^3"
  }
}
```

`packages/print-geometry/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["src/**/__tests__/**"]
}
```

`packages/print-geometry/vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["src/**/__tests__/**/*.test.ts"] },
});
```

- [ ] **Step 3: Write the failing layout test**

`packages/print-geometry/src/__tests__/layout.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { PAGE_DIMENSIONS } from "../page";
import { layoutPlate, orientationFromPixels } from "../layout";

const A5 = PAGE_DIMENSIONS.A5_PORTRAIT;

describe("orientationFromPixels", () => {
  it("calls a wider-than-tall image landscape", () => {
    expect(orientationFromPixels(2608, 1370)).toBe("LANDSCAPE");
  });

  it("calls a square image portrait, matching a portrait page without rotation", () => {
    expect(orientationFromPixels(1440, 1440)).toBe("PORTRAIT");
  });
});

describe("layoutPlate", () => {
  it("fits a portrait plate inside the margin, minus the caption band", () => {
    const layout = layoutPlate({
      imageWidthPx: 1880,
      imageHeightPx: 2280,
      orientation: "PORTRAIT",
      page: A5,
      hasCaption: true,
    });

    expect(layout.needsRotation).toBe(false);
    // Width binds: (419.5208 - 56.7) / 1880
    expect(layout.scale).toBeCloseTo(0.19299, 5);
    expect(layout.drawW).toBeCloseTo(362.8208, 3);
    // Never wider than the print area, never into the margin.
    expect(layout.drawX).toBeGreaterThanOrEqual(28.35);
    expect(layout.drawW).toBeLessThanOrEqual(419.5208 - 56.7 + 1e-9);
  });

  it("reclaims the caption band when there is no caption", () => {
    const withCaption = layoutPlate({
      imageWidthPx: 1000,
      imageHeightPx: 2000,
      orientation: "PORTRAIT",
      page: A5,
      hasCaption: true,
    });
    const without = layoutPlate({
      imageWidthPx: 1000,
      imageHeightPx: 2000,
      orientation: "PORTRAIT",
      page: A5,
      hasCaption: false,
    });

    // This plate is height-bound, so the 16pt band is exactly what it costs.
    expect(without.scale).toBeGreaterThan(withCaption.scale);
  });

  it("rotates a landscape plate onto a portrait page and takes the band from the width", () => {
    const layout = layoutPlate({
      imageWidthPx: 2608,
      imageHeightPx: 1370,
      orientation: "LANDSCAPE",
      page: A5,
      hasCaption: true,
    });

    expect(layout.needsRotation).toBe(true);
    // availW = 362.8208 - 16 = 346.8208, availH = 538.566
    // scale = min(346.8208 / 1370, 538.566 / 2608)
    expect(layout.scale).toBeCloseTo(0.20650, 5);
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `pnpm --filter @printfeed/print-geometry test`
Expected: FAIL — `Cannot find module '../page'`.

- [ ] **Step 5: Write `page.ts`**

`packages/print-geometry/src/page.ts` — lifted verbatim from
`apps/pdf-worker/src/booklet/booklet.types.ts` and
`artwork-page.service.ts` so the numbers do not change:

```ts
export type PageFormat =
  | "A5_PORTRAIT"
  | "A5_LANDSCAPE"
  | "A4_PORTRAIT"
  | "A4_LANDSCAPE"
  | "SQUARE_210"
  | "SQUARE_148"
  | "LETTER";

export const DEFAULT_PAGE_FORMAT: PageFormat = "A5_PORTRAIT";

export interface PageDimensions {
  widthPt: number;
  heightPt: number;
}

const MM_TO_PT = 2.8346;

function mm(value: number): number {
  return value * MM_TO_PT;
}

export const PAGE_DIMENSIONS: Record<PageFormat, PageDimensions> = {
  A5_PORTRAIT: { widthPt: mm(148), heightPt: mm(210) },
  A5_LANDSCAPE: { widthPt: mm(210), heightPt: mm(148) },
  A4_PORTRAIT: { widthPt: mm(210), heightPt: mm(297) },
  A4_LANDSCAPE: { widthPt: mm(297), heightPt: mm(210) },
  SQUARE_210: { widthPt: mm(210), heightPt: mm(210) },
  SQUARE_148: { widthPt: mm(148), heightPt: mm(148) },
  LETTER: { widthPt: mm(216), heightPt: mm(279) },
};

/** 10mm, per Peecho's file guidelines. */
export const MARGIN_PT = 28.35;

/**
 * Strip of the print area reserved for the plate caption, along whichever edge
 * is the image's own bottom. Taken out of the space available to the image,
 * never out of the safe margin.
 */
export const CAPTION_BAND_PT = 16;
```

- [ ] **Step 6: Write `layout.ts`**

`packages/print-geometry/src/layout.ts`. The body is the placement maths moved
out of `artwork-page.service.ts:119-156` unchanged — this is a move, not a
rewrite, and the renderer will call it in Task 2.

```ts
import { CAPTION_BAND_PT, MARGIN_PT, type PageDimensions } from "./page";

export interface PlateInput {
  imageWidthPx: number;
  imageHeightPx: number;
  /** "PORTRAIT" | "LANDSCAPE"; anything else is treated as portrait. */
  orientation: string;
  page: PageDimensions;
  hasCaption: boolean;
}

export interface PlateLayout {
  needsRotation: boolean;
  /** Points drawn per source pixel. Effective dpi is 72 / scale. */
  scale: number;
  drawW: number;
  drawH: number;
  drawX: number;
  drawY: number;
}

export function orientationFromPixels(
  width: number,
  height: number,
): "PORTRAIT" | "LANDSCAPE" {
  return width > height ? "LANDSCAPE" : "PORTRAIT";
}

export function layoutPlate(input: PlateInput): PlateLayout {
  const { imageWidthPx, imageHeightPx, orientation, page, hasCaption } = input;
  const { widthPt: PAGE_WIDTH_PT, heightPt: PAGE_HEIGHT_PT } = page;

  const captionBandPt = hasCaption ? CAPTION_BAND_PT : 0;

  const isImageLandscape = orientation === "LANDSCAPE";
  const isPageLandscape = PAGE_WIDTH_PT > PAGE_HEIGHT_PT;
  const needsRotation = isImageLandscape !== isPageLandscape;

  const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
  const printH = PAGE_HEIGHT_PT - MARGIN_PT * 2;

  // On a rotated plate the caption's edge is vertical, so the band comes out
  // of the width instead of the height.
  const bandW = needsRotation ? captionBandPt : 0;
  const bandH = needsRotation ? 0 : captionBandPt;
  const availW = printW - bandW;
  const availH = printH - bandH;

  if (needsRotation) {
    // pdf-lib rotates 90° CCW around the bottom-left anchor, so the visible
    // extents swap and scaling is against the post-rotation dimensions.
    const scale = Math.min(availW / imageHeightPx, availH / imageWidthPx);
    const drawW = imageWidthPx * scale;
    const drawH = imageHeightPx * scale;
    return {
      needsRotation,
      scale,
      drawW,
      drawH,
      drawX: MARGIN_PT + (availW - drawH) / 2 + drawH,
      drawY: MARGIN_PT + (availH - drawW) / 2,
    };
  }

  const scale = Math.min(availW / imageWidthPx, availH / imageHeightPx);
  const drawW = imageWidthPx * scale;
  const drawH = imageHeightPx * scale;
  return {
    needsRotation,
    scale,
    drawW,
    drawH,
    drawX: MARGIN_PT + (availW - drawW) / 2,
    drawY: MARGIN_PT + bandH + (availH - drawH) / 2,
  };
}
```

- [ ] **Step 7: Run the layout tests — they must pass**

Run: `pnpm --filter @printfeed/print-geometry test`
Expected: PASS, 5 tests.

- [ ] **Step 8: Write the failing grade test**

`packages/print-geometry/src/__tests__/grade.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { gradePlate, plateDpi } from "../grade";
import { PAGE_DIMENSIONS } from "../page";

const A5 = PAGE_DIMENSIONS.A5_PORTRAIT;
const on = (imageWidthPx: number, imageHeightPx: number) => ({
  imageWidthPx,
  imageHeightPx,
  orientation: imageWidthPx > imageHeightPx ? "LANDSCAPE" : "PORTRAIT",
  page: A5,
  hasCaption: true,
});

describe("plateDpi", () => {
  it("measures against the margined page the renderer actually draws", () => {
    // The regression that started this: the old gate rejected 1880x2280 for
    // being under a full-bleed 300dpi floor. Drawn inside the margin it is
    // comfortably past 300.
    expect(Math.round(plateDpi(on(1880, 2280)))).toBe(373);
  });

  it("is 72 divided by the renderer's own scale", () => {
    // 1080x1920 is the commonest Threads portrait size.
    expect(Math.round(plateDpi(on(1080, 1920)))).toBe(265);
  });
});

describe("gradePlate", () => {
  it("passes a plate at or above the floor", () => {
    expect(gradePlate(on(1880, 2280))).toBe("OK");
    expect(gradePlate(on(1080, 1920))).toBe("OK");
  });

  it("marks a plate between the warn line and the floor as marginal", () => {
    // 1131x1685 lands at ~232dpi.
    expect(gradePlate(on(1131, 1685))).toBe("MARGINAL");
  });

  it("rejects a plate below the warn line", () => {
    expect(gradePlate(on(819, 1024))).toBe("REJECT"); // ~163dpi
    expect(gradePlate(on(720, 405))).toBe("REJECT"); // ~96dpi, rotated
  });

  it("rejects a plate with no usable pixel dimensions", () => {
    expect(gradePlate(on(0, 0))).toBe("REJECT");
  });
});
```

- [ ] **Step 9: Run it and watch it fail**

Run: `pnpm --filter @printfeed/print-geometry test`
Expected: FAIL — `Cannot find module '../grade'`.

- [ ] **Step 10: Write `grade.ts`**

```ts
import { layoutPlate, type PlateInput } from "./layout";

/** At or above this, a plate prints without comment. */
export const PRINT_DPI_FLOOR = 250;

/**
 * Between this and the floor a plate still prints, but the collector is told
 * it will look soft and can drop it. Below it, the plate is dropped.
 *
 * Peecho's own published guidance is >=150dpi for images and 220dpi for
 * text-heavy documents. These sit above that deliberately: the printer's
 * minimum is what it will accept, not what we are willing to put our name on.
 * Expect to revise both once the proof print (Task 4) has been held.
 */
export const PRINT_DPI_WARN = 200;

export type PlateGrade = "OK" | "MARGINAL" | "REJECT";

/** Effective resolution of a plate as the renderer will place it, in dpi. */
export function plateDpi(input: PlateInput): number {
  if (input.imageWidthPx <= 0 || input.imageHeightPx <= 0) return 0;
  const { scale } = layoutPlate(input);
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return 72 / scale;
}

export function gradePlate(input: PlateInput): PlateGrade {
  const dpi = plateDpi(input);
  if (dpi >= PRINT_DPI_FLOOR) return "OK";
  if (dpi >= PRINT_DPI_WARN) return "MARGINAL";
  return "REJECT";
}
```

- [ ] **Step 11: Write `index.ts`**

```ts
export * from "./grade";
export * from "./layout";
export * from "./page";
```

- [ ] **Step 12: Run the whole package suite**

Run: `pnpm --filter @printfeed/print-geometry test`
Expected: PASS, 10 tests.

If `plateDpi` returns something other than 373 or 265, do **not** adjust the
test to match. Recheck `page.ts` against `booklet.types.ts` and `layout.ts`
against `artwork-page.service.ts:119-156` — a mismatch there is the bug this
whole plan exists to prevent.

- [ ] **Step 13: Build it, so consumers resolve `dist`**

Run: `pnpm install && pnpm --filter @printfeed/print-geometry build`
Expected: `packages/print-geometry/dist/index.js` and `index.d.ts` exist.

- [ ] **Step 14: Teach the Docker build about the package**

In `Dockerfile.pdf-worker`, the `deps` stage must see the new manifest or
`pnpm install --frozen-lockfile` fails on a workspace it cannot find. Add after
the `apps/mvp/package.json` copy:

```dockerfile
COPY packages/print-geometry/package.json ./packages/print-geometry/
```

In the `builder` stage, add after `COPY apps/pdf-worker ./apps/pdf-worker`:

```dockerfile
COPY packages ./packages
```

and replace `RUN pnpm --filter pdf-worker build` with:

```dockerfile
RUN pnpm --filter @printfeed/print-geometry build && pnpm --filter pdf-worker build
```

In the `runner` stage, the copied `node_modules` contains a symlink into
`/app/packages/print-geometry`, so the target has to exist. Add after the
`profiles` copy:

```dockerfile
COPY --from=builder --chown=nestjs:nodejs /app/packages ./packages
```

- [ ] **Step 15: Verify the production image still builds**

Run: `docker build -f Dockerfile.pdf-worker -t pdf-worker-check .`
Expected: build succeeds through all stages. This is the step that catches a
broken deploy before Railway does.

- [ ] **Step 16: Commit**

The lockfile change **is** intentional here — it records the new workspace
package. Do not revert it this time.

```bash
git add pnpm-workspace.yaml pnpm-lock.yaml Dockerfile.pdf-worker packages/
git commit -m "Share the plate geometry between renderer and gate

The resolution gate assumed a full-bleed page; the renderer has always
drawn inside a 10mm margin. Two expressions of the same measurement,
already disagreeing. One function now serves both."
```

---

### Task 2: The renderer consumes the shared layout

Proves the extraction is faithful and removes the second copy of the maths.

**Files:**
- Modify: `apps/pdf-worker/src/booklet/pdf/artwork-page.service.ts:11-19,119-156`
- Modify: `apps/pdf-worker/package.json` (add the dependency)
- Test: `apps/pdf-worker/src/booklet/pdf/artwork-page.service.spec.ts`

**Interfaces:**
- Consumes: `layoutPlate`, `MARGIN_PT`, `CAPTION_BAND_PT` from `@printfeed/print-geometry`.
- Produces: no signature change. `ArtworkPageService.addPageAsync` keeps its
  current parameters and return type.

- [ ] **Step 1: Add the dependency**

In `apps/pdf-worker/package.json`, under `dependencies`:

```json
"@printfeed/print-geometry": "workspace:*"
```

Run: `pnpm install`

- [ ] **Step 2: Run the existing render specs and record the baseline**

Run: `pnpm --filter pdf-worker test -- artwork-page.service.spec.ts`
Expected: PASS. Note the count — it must not change in this task.

- [ ] **Step 3: Replace the inline maths with the shared call**

In `artwork-page.service.ts`, delete the local `const MARGIN_PT = 28.35;` and
`const CAPTION_BAND_PT = 16;` declarations and import them instead:

```ts
import {
  CAPTION_BAND_PT,
  layoutPlate,
  MARGIN_PT,
} from "@printfeed/print-geometry";
```

Replace the block from `const printW = ...` through the closing brace of the
`else` (currently lines 119-156) with:

```ts
    const { needsRotation, drawW, drawH, drawX, drawY } = layoutPlate({
      imageWidthPx: image.width,
      imageHeightPx: image.height,
      orientation,
      page: pageDimensions,
      hasCaption: Boolean(captionText),
    });
    const rotate = needsRotation ? degrees(90) : degrees(0);
```

`printW` is still referenced by the rotated caption's `x` (line 189). Keep it as
a single local right before the caption block:

```ts
      const printW = PAGE_WIDTH_PT - MARGIN_PT * 2;
```

Delete the now-unused `isImageLandscape`, `isPageLandscape`, `captionBandPt`,
`bandW`, `bandH`, `availW`, `availH` locals and the `let` declarations for
`drawW`/`drawH`/`drawX`/`drawY`/`rotate`.

- [ ] **Step 4: Run the render specs — output must be identical**

Run: `pnpm --filter pdf-worker test -- artwork-page.service.spec.ts`
Expected: PASS, same count as Step 2. Any failure means the extraction changed
the geometry; fix `layout.ts`, not the test.

- [ ] **Step 5: Typecheck and format**

Run: `pnpm --filter pdf-worker typecheck && pnpm --filter pdf-worker lint:format`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add apps/pdf-worker/package.json apps/pdf-worker/src/booklet/pdf/artwork-page.service.ts pnpm-lock.yaml
git commit -m "Draw plates through the shared layout function"
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

### Task 3: Tiered grading and skip-and-report in the processor

**Files:**
- Modify: `apps/pdf-worker/src/booklet/booklet.types.ts`
- Modify: `apps/pdf-worker/src/booklet/booklet.processor.ts:89-101`
- Test: `apps/pdf-worker/src/booklet/booklet.processor.spec.ts`

**Interfaces:**
- Consumes: `gradePlate`, `plateDpi`, `PageFormat`, `PAGE_DIMENSIONS`, `DEFAULT_PAGE_FORMAT` from `@printfeed/print-geometry`.
- Produces:
  - `interface SkippedPlate { id: string; title: string | null; dpi: number; reason: "below-floor" | "unmeasurable" }`
  - `interface BookletJobResult { pdfUrl: string; pageCount: number; skipped: SkippedPlate[]; marginal: string[] }`

- [ ] **Step 1: Write the failing processor tests**

Append to `apps/pdf-worker/src/booklet/booklet.processor.spec.ts`, inside the
existing top-level `describe`:

```ts
  it("drops an under-floor plate and prints the rest", async () => {
    mockFindMany.mockResolvedValue([
      makeSelection([
        { ...validArtwork, id: "good", width: 2000, height: 2800 },
        { ...validArtwork, id: "tiny", width: 720, height: 405 },
      ]),
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.from("bytes"));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 2,
    });

    const result = await processor.process(makeJob(baseJobData));

    expect(result.skipped).toEqual([
      { id: "tiny", title: "Test Art", dpi: 96, reason: "below-floor" },
    ]);
    // The good plate still reached the builder.
    const [artworks] = mockPdfBuilder.build.mock.calls[0];
    expect(artworks.map((a: { id: string }) => a.id)).toEqual(["good"]);
  });

  it("keeps a marginal plate but reports it", async () => {
    mockFindMany.mockResolvedValue([
      makeSelection([
        { ...validArtwork, id: "soft", width: 1131, height: 1685 },
      ]),
    ]);
    mockStorage.downloadObject.mockResolvedValue(Buffer.from("bytes"));
    mockPdfBuilder.build.mockResolvedValue({
      bytes: new Uint8Array([1]),
      pageCount: 1,
    });

    const result = await processor.process(makeJob(baseJobData));

    expect(result.skipped).toEqual([]);
    expect(result.marginal).toEqual(["soft"]);
  });

  it("fails the job only when nothing survives grading", async () => {
    mockFindMany.mockResolvedValue([
      makeSelection([
        { ...validArtwork, id: "tiny", width: 720, height: 405 },
      ]),
    ]);

    await expect(processor.process(makeJob(baseJobData))).rejects.toThrow(
      /no plates met the print floor/i,
    );
  });
```

Add the `makeSelection` helper near `makeJob` if the file does not already have
an equivalent — mirror the shape of the existing `baseSelection` fixture:

```ts
function makeSelection(artworks: (typeof validArtwork)[]) {
  return {
    release: {
      artworks: artworks.map((artwork) => ({ artwork })),
      creatorProfile: { displayName: "Test Creator" },
    },
  };
}
```

`baseJobData` is the existing job-data fixture in the file; reuse it as-is.

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter pdf-worker test -- booklet.processor.spec.ts`
Expected: FAIL — the first two on `result.skipped` being undefined, the third
because the current code throws a different message on the first bad plate.

- [ ] **Step 3: Update the types**

In `booklet.types.ts`, delete `MIN_WIDTH_PX` and `MIN_HEIGHT_PX` entirely along
with their doc comment, delete the local `PageFormat`, `PageDimensions`,
`PAGE_DIMENSIONS`, `DEFAULT_PAGE_FORMAT` and `MM_TO_PT`/`mm`, and re-export from
the package so existing importers keep working:

```ts
export {
  DEFAULT_PAGE_FORMAT,
  PAGE_DIMENSIONS,
  type PageDimensions,
  type PageFormat,
} from "@printfeed/print-geometry";

export interface SkippedPlate {
  id: string;
  title: string | null;
  dpi: number;
  reason: "below-floor" | "unmeasurable";
}

export interface BookletJobResult {
  pdfUrl: string;
  pageCount: number;
  /** Plates dropped before building. Never silently discarded. */
  skipped: SkippedPlate[];
  /** Ids of plates that printed but will look soft. */
  marginal: string[];
}
```

Leave `BookletJobData` and `ArtworkRecord` unchanged in this task — Task 6
rewrites them.

- [ ] **Step 4: Replace the validation loop in the processor**

In `booklet.processor.ts`, replace the imports of `MIN_HEIGHT_PX`/`MIN_WIDTH_PX`
with `gradePlate` and `plateDpi` from `@printfeed/print-geometry`, and add
`SkippedPlate` to the existing type import from `./booklet.types`:

```ts
import { gradePlate, plateDpi } from "@printfeed/print-geometry";
import type {
  BookletJobData,
  BookletJobResult,
  SkippedPlate,
} from "./booklet.types";
```

Then replace the whole `for (const artwork of artworks) { ... }` block at
lines 89-101 with:

```ts
      // A collection is 70+ pieces from strangers' phones; one under-floor
      // image must not take the whole booklet down with it. Drop it, print
      // the rest, and say exactly what fell out.
      const page = PAGE_DIMENSIONS[pageFormat];
      const skipped: SkippedPlate[] = [];
      const marginal: string[] = [];
      const printable: typeof artworks = [];

      for (const artwork of artworks) {
        if (!artwork.width || !artwork.height) {
          skipped.push({
            id: artwork.id,
            title: artwork.title,
            dpi: 0,
            reason: "unmeasurable",
          });
          continue;
        }

        const input = {
          imageWidthPx: artwork.width,
          imageHeightPx: artwork.height,
          orientation: artwork.orientation,
          page,
          hasCaption: true,
        };
        const grade = gradePlate(input);

        if (grade === "REJECT") {
          skipped.push({
            id: artwork.id,
            title: artwork.title,
            dpi: Math.round(plateDpi(input)),
            reason: "below-floor",
          });
          continue;
        }

        if (grade === "MARGINAL") marginal.push(artwork.id);
        printable.push(artwork);
      }

      if (printable.length === 0) {
        throw new Error(
          `No plates met the print floor: ${skipped.length} of ${artworks.length} were below it`,
        );
      }
```

Then change every later use of `artworks` — the download loop and the
`pdfBuilder.build` call — to `printable`, and change the `return` to:

```ts
      return { pdfUrl, pageCount, skipped, marginal };
```

Note the `orientation === "UNKNOWN"` check is gone: orientation no longer gates
anything, because `layoutPlate` treats anything that is not `"LANDSCAPE"` as
portrait, which is the correct fallback for an unknown.

- [ ] **Step 5: Run the processor specs**

Run: `pnpm --filter pdf-worker test -- booklet.processor.spec.ts`
Expected: PASS, including every pre-existing test. A pre-existing test that
asserted the old throw-on-first-bad-plate behaviour should be **updated**, not
deleted — it becomes an assertion that the plate is skipped.

- [ ] **Step 6: Full worker suite, typecheck, format**

Run: `pnpm --filter pdf-worker test && pnpm --filter pdf-worker typecheck && pnpm --filter pdf-worker lint:format`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add apps/pdf-worker/src/booklet/
git commit -m "Grade plates on a tiered floor and skip the unprintable

One under-floor image used to fail the entire job, which for a 77-piece
collection meant the first bad plate killed it. Plates are now graded
against the margined page and dropped individually, with the drops
reported rather than swallowed."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

### Task 4: The proof print

Produces the physical artifact that settles the dpi question. Do this before the
consolidation work — it has shipping lead time.

**Files:**
- Modify: `apps/pdf-worker/scripts/build-demo-booklet.cts`

**Interfaces:**
- Consumes: `gradePlate`, `plateDpi`, `PAGE_DIMENSIONS`, `orientationFromPixels` from `@printfeed/print-geometry`.
- Produces: a PDF plus a sibling `<out>.manifest.json` recording each plate's
  tier, so the printed copy can be read against the numbers.

- [ ] **Step 1: Replace the hard floor with grading**

In `build-demo-booklet.cts`, drop the `MIN_HEIGHT_PX`/`MIN_WIDTH_PX` import (they
no longer exist) and import from the package instead:

```ts
import {
  gradePlate,
  orientationFromPixels,
  PAGE_DIMENSIONS,
  type PlateGrade,
  plateDpi,
} from "@printfeed/print-geometry";
```

Add `grade: PlateGrade` and `dpi: number` to the `Candidate` interface. In
`scan()`, replace the `if (width < MIN_WIDTH_PX || height < MIN_HEIGHT_PX)`
block with:

```ts
      const input = {
        imageWidthPx: width,
        imageHeightPx: height,
        orientation: orientationFromPixels(width, height),
        page: PAGE_DIMENSIONS[opts.format],
        hasCaption: true,
      };
      const grade = gradePlate(input);
      const dpi = Math.round(plateDpi(input));

      if (grade === "REJECT") {
        rejected.push({ handle, file, reason: `${width}×${height}, ${dpi}dpi — below the print floor` });
        continue;
      }
```

and add `grade` and `dpi` to the pushed candidate. `scan()` needs access to
`opts.format`, so pass it in as a parameter.

- [ ] **Step 2: Add a `--tier-sample` mode**

The diagnostic booklet needs plates from all three bands, not just the best ones.
Add the option to `parseArgs` (`tierSample: false`) and, in `select()`, when it
is set, take up to `perArtist` from each of the `OK` (≥300dpi), `OK` (250-299)
and `MARGINAL` bands per artist rather than simply the first N:

```ts
function select(
  candidates: Candidate[],
  perArtist: number,
  tierSample: boolean,
): Candidate[] {
  const band = (c: Candidate) =>
    c.dpi >= 300 ? "high" : c.grade === "OK" ? "mid" : "soft";

  const byHandle = new Map<string, Candidate[]>();
  for (const candidate of candidates) {
    const bucket = byHandle.get(candidate.handle) ?? [];
    bucket.push(candidate);
    byHandle.set(candidate.handle, bucket);
  }

  return [...byHandle.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([, items]) => {
      if (!tierSample) return perArtist > 0 ? items.slice(0, perArtist) : items;
      const take = perArtist > 0 ? perArtist : items.length;
      return ["high", "mid", "soft"].flatMap((b) =>
        items.filter((i) => band(i) === b).slice(0, take),
      );
    });
}
```

- [ ] **Step 3: Write the manifest beside the PDF**

After the PDF is written in `main()`, add:

```ts
  await writeFile(
    `${opts.out}.manifest.json`,
    JSON.stringify(
      {
        issue: opts.issue,
        format: opts.format,
        floor: { print: 250, warn: 200 },
        plates: selected.map((c, index) => ({
          page: index + 2, // page 1 is the cover
          handle: c.handle,
          file: c.file,
          pixels: `${c.width}×${c.height}`,
          dpi: c.dpi,
          grade: c.grade,
        })),
        rejected,
      },
      null,
      2,
    ),
  );
  console.log(`  manifest → ${opts.out}.manifest.json`);
```

- [ ] **Step 4: Dry-run and sanity-check the coverage**

Run:
```bash
cd apps/pdf-worker
npx tsx scripts/build-demo-booklet.cts --dry-run --per-artist 0
```
Expected: roughly **78 of 108 plates from ~20 of 31 artists** pass, versus 32
from 10 under the old floor. If it is still ~32, the grading is not being
applied — do not proceed.

- [ ] **Step 5: Build the diagnostic booklet**

Run:
```bash
npx tsx scripts/build-demo-booklet.cts \
  --tier-sample --per-artist 1 \
  --issue "Proof 01" \
  --out ~/Downloads/printfeed-proof-01.pdf
```
Expected: a PDF/X-3 file plus `printfeed-proof-01.pdf.manifest.json`. Verify
with `pdfinfo ~/Downloads/printfeed-proof-01.pdf` that `PDF subtype` is
`PDF/X-3:2002` and the page size is `419.52 x 595.27 pts`.

- [ ] **Step 6: Check the page count against Peecho before ordering**

Open Peecho's magazine file guideline
(`https://support.peecho.com/hc/en-us/articles/19746186078876-Magazines-File-set-up-guideline`)
and confirm the perfect-bound minimum and maximum page counts. If the booklet
falls outside them, re-run Step 5 with a different `--per-artist` until it fits.
**Record the confirmed limits in the spec** — they are still marked unverified
there.

- [ ] **Step 7: Order one physical copy by hand**

Upload the PDF through Peecho's normal web order flow — manually, not via the
API, which keeps this inside the "no live order integration" scope. Order a
single copy to the user's own address.

- [ ] **Step 8: Commit the script changes**

```bash
git add apps/pdf-worker/scripts/build-demo-booklet.cts
git commit -m "Grade the demo booklet and record each plate's tier

The proof print has to answer whether 250dpi is good enough on paper,
which it can only do if the printed copy deliberately spans the bands
and a manifest says which page is which."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

**Do not block the remaining tasks on the print arriving.** When it does, revise
`PRINT_DPI_FLOOR` / `PRINT_DPI_WARN` in `packages/print-geometry/src/grade.ts` —
that is the only place either number lives.

---

### Task 5: `GeneratedPrintFile` accepts a collection

**Files:**
- Modify: `apps/mvp/prisma/schema.prisma:464-483` and the `Collection` model at :842
- Create: a new migration under `apps/mvp/prisma/migrations/`

**Interfaces:**
- Consumes: nothing.
- Produces: `GeneratedPrintFile.collectionId: String?` with `@@unique([collectionId])`;
  `collectorProfileId` and `cycleId` become `String?`.

- [ ] **Step 1: Edit the schema**

Replace the `GeneratedPrintFile` model with:

```prisma
model GeneratedPrintFile {
  id                 String          @id @default(cuid())
  // Null for a collection booklet; a collection has no profile or cycle.
  collectorProfileId String?
  cycleId            String?
  // Null for a cycle booklet. Postgres treats NULLs as distinct, so the
  // cycle uniqueness above is unaffected by collection rows.
  collectionId       String?
  storageUrl         String?
  pageCount          Int?
  widthMm            Float?
  heightMm           Float?
  status             PrintFileStatus @default(PENDING)
  errorMessage       String?
  generatedAt        DateTime?
  createdAt          DateTime        @default(now())
  updatedAt          DateTime        @updatedAt

  collectorProfile CollectorProfile?  @relation(fields: [collectorProfileId], references: [id], onDelete: Cascade)
  cycle            SubscriptionCycle? @relation(fields: [cycleId], references: [id])
  collection       Collection?        @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  fulfillmentOrder FulfillmentOrder?

  @@unique([collectorProfileId, cycleId])
  @@unique([collectionId])
}
```

In the `Collection` model (line 842), add to the relations block:

```prisma
  printFiles    GeneratedPrintFile[]
```

- [ ] **Step 2: Create the migration**

Run: `pnpm --filter mvp db:migrate --name generated_print_file_collection`
Expected: a new directory under `apps/mvp/prisma/migrations/`. Read the
generated `.sql` and confirm it only makes the two columns nullable and adds
`collectionId` + its unique index. It must not drop or recreate the table.

- [ ] **Step 3: Typecheck**

Run: `cd apps/mvp && npx prisma generate && pnpm --filter mvp typecheck`
Expected: errors anywhere `collectorProfileId`/`cycleId` are now `string | null`.
Fix them by narrowing at the call site — do not cast with `!`.

- [ ] **Step 4: Commit**

```bash
git add apps/mvp/prisma/
git commit -m "Let a print file belong to a collection"
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

### Task 6: Invert the job payload

**Files:**
- Modify: `apps/pdf-worker/src/booklet/booklet.types.ts`
- Modify: `apps/pdf-worker/src/booklet/booklet.processor.ts`
- Modify: `apps/mvp/lib/billing/pdf-trigger-service.ts`
- Test: `apps/pdf-worker/src/booklet/booklet.processor.spec.ts`

**Interfaces:**
- Consumes: `SkippedPlate`, `BookletJobResult` from Task 3.
- Produces:
  ```ts
  interface ArtworkRecord {
    id: string;
    title: string | null;
    storageKey: string;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    orientation: string;
    creatorName?: string | null;
  }
  interface BookletJobData {
    printFileId: string;
    issueLabel: string;
    pageFormat?: PageFormat;
    plates: ArtworkRecord[];
  }
  ```

- [ ] **Step 1: Change `BookletJobData`**

In `booklet.types.ts`, replace `BookletJobData` with the shape above. Leave
`ArtworkRecord` as it is — it already carries everything the payload needs.

- [ ] **Step 2: Rewrite the processor's head and tail**

In `booklet.processor.ts`:

Replace the destructure and the opening status update with:

```ts
    const {
      printFileId,
      issueLabel,
      pageFormat = DEFAULT_PAGE_FORMAT,
      plates,
    } = job.data;
    this.logger.log(
      `Processing booklet job ${job.id} for printFile=${printFileId} (${plates.length} plates)`,
    );

    await this.prisma.generatedPrintFile.update({
      where: { id: printFileId },
      data: { status: "GENERATING", errorMessage: null },
    });
```

Delete the entire `collectorReleaseSelection.findMany` block and the `artworks`
flatMap that follows it. Replace them with:

```ts
      const artworks = plates;
      if (artworks.length === 0) {
        throw new Error("Job payload carried no plates");
      }
```

Derive the cover byline from the payload instead of the selections:

```ts
      const creatorNames: string[] = [
        ...new Set(
          printable
            .map((plate) => plate.creatorName)
            .filter((name): name is string => Boolean(name)),
        ),
      ];
```

Change both remaining `generatedPrintFile.updateMany({ where: { collectorProfileId, cycleId }, ... })`
calls — the success one and the one in the `catch` — to
`update({ where: { id: printFileId }, ... })`.

In the Sentry `extra`, replace `collectorProfileId`/`cycleId` with `printFileId`.

- [ ] **Step 3: Update the processor spec**

Delete the `collectorReleaseSelection` mock and the `mockFindMany` fixtures;
replace `mockUpdateMany` with `mockUpdate`:

```ts
const mockUpdate = jest.fn().mockResolvedValue({ id: "pf-1" });
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    generatedPrintFile: { update: mockUpdate },
  })),
}));
```

Rewrite `baseJobData` and drop `makeSelection`; every test now supplies plates
directly:

```ts
const baseJobData: BookletJobData = {
  printFileId: "pf-1",
  issueLabel: "Test Issue",
  plates: [validArtwork],
};
```

The three grading tests from Task 3 change from `mockFindMany.mockResolvedValue(...)`
to passing plates into `makeJob({ ...baseJobData, plates: [...] })`. Their
assertions do not change — that is the point.

- [ ] **Step 4: Run the worker suite**

Run: `pnpm --filter pdf-worker test`
Expected: PASS.

- [ ] **Step 5: Move the cycle query into the trigger service**

In `apps/mvp/lib/billing/pdf-trigger-service.ts`, inside the per-collector loop,
after the existing `selections.length === 0` guard, resolve the artwork with the
same query and creator-stamping the worker used to do:

```ts
      const resolved = await db.collectorReleaseSelection.findMany({
        where: { collectorProfileId: collectorId, cycleId },
        include: {
          release: {
            include: {
              artworks: {
                include: { artwork: true },
                orderBy: { sortOrder: "asc" },
              },
              creatorProfile: { select: { displayName: true } },
            },
          },
        },
      });

      // The creator lives on the release, not the artwork, so it is stamped
      // onto each plate here — otherwise a multi-creator booklet loses which
      // artist made what and every plate goes uncredited.
      const plates = resolved.flatMap((sel) =>
        sel.release.artworks.map((ra) => ({
          id: ra.artwork.id,
          title: ra.artwork.title,
          storageKey: ra.artwork.storageKey,
          mimeType: ra.artwork.mimeType,
          width: ra.artwork.width,
          height: ra.artwork.height,
          orientation: ra.artwork.orientation,
          creatorName: sel.release.creatorProfile.displayName,
        })),
      );
```

Find where the job is currently enqueued (`queue.add(...)`) and change the
payload to `{ printFileId: existingFile.id, issueLabel, plates }`, where
`existingFile` is the `GeneratedPrintFile` row the function already
finds-or-creates. If it currently only checks for existence, change it to
upsert and keep the row's `id`.

- [ ] **Step 6: mvp typecheck and tests**

Run: `pnpm --filter mvp typecheck && pnpm --filter mvp test:backend`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/pdf-worker/src/booklet/ apps/mvp/lib/billing/pdf-trigger-service.ts
git commit -m "Resolve artwork in the caller, not the worker

The worker owned the CollectorReleaseSelection query, which is the only
reason a collection could not use the same pipeline. Callers now hand it
a resolved plate list and a row to update, so one worker path serves
both cycles and collections."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

### Task 7: Collection → booklet job

**Files:**
- Create: `apps/mvp/lib/collect/print-service.ts`
- Create: `apps/mvp/lib/collect/__tests__/print-service.test.ts`

**Interfaces:**
- Consumes: `BookletJobData` shape from Task 6; `gradePlate`, `plateDpi`,
  `orientationFromPixels`, `PAGE_DIMENSIONS`, `DEFAULT_PAGE_FORMAT` from the package.
- Produces:
  - `interface CollectionPlate { id: string; handle: string; grade: PlateGrade; dpi: number }`
  - `interface CollectionReadiness { total: number; ok: number; marginal: number; rejected: number; plates: CollectionPlate[] }`
  - `function assessCollection(token: string): Promise<CollectionReadiness | null>`
  - `function enqueueCollectionBooklet(token: string, keepMarginalIds: string[]): Promise<{ printFileId: string; plateCount: number }>`

- [ ] **Step 1: Write the failing test**

`apps/mvp/lib/collect/__tests__/print-service.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    collection: { findUnique: vi.fn() },
  },
}));

import { db } from "@/lib/db";
import { assessCollection } from "../print-service";

const item = (id: string, width: number, height: number) => ({
  id,
  width,
  height,
  sourceHandle: "someartist",
  storageKey: `collect/tok/${id}.jpg`,
  caption: null,
});

describe("assessCollection", () => {
  it("sorts every collected item into a tier", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue({
      id: "col-1",
      items: [
        item("a", 1880, 2280), // ~373dpi
        item("b", 1131, 1685), // ~232dpi
        item("c", 819, 1024), // ~163dpi
      ],
    } as never);

    const readiness = await assessCollection("tok");

    expect(readiness).toMatchObject({ total: 3, ok: 1, marginal: 1, rejected: 1 });
    expect(readiness?.plates.map((p) => p.grade)).toEqual([
      "OK",
      "MARGINAL",
      "REJECT",
    ]);
  });

  it("returns null for an unknown token", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue(null as never);
    expect(await assessCollection("nope")).toBeNull();
  });

  it("treats an item with no measured size as rejected", async () => {
    vi.mocked(db.collection.findUnique).mockResolvedValue({
      id: "col-1",
      items: [{ ...item("a", 0, 0), width: null, height: null }],
    } as never);

    const readiness = await assessCollection("tok");
    expect(readiness).toMatchObject({ total: 1, ok: 0, marginal: 0, rejected: 1 });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `pnpm --filter mvp test lib/collect/__tests__/print-service.test.ts`
Expected: FAIL — `Cannot find module '../print-service'`.

- [ ] **Step 3: Add the dependency to mvp**

In `apps/mvp/package.json` dependencies, add
`"@printfeed/print-geometry": "workspace:*"`, then run `pnpm install`.

- [ ] **Step 4: Write `print-service.ts`**

```ts
import { Queue } from "bullmq";
import {
  DEFAULT_PAGE_FORMAT,
  gradePlate,
  orientationFromPixels,
  PAGE_DIMENSIONS,
  type PlateGrade,
  plateDpi,
} from "@printfeed/print-geometry";
import { db } from "@/lib/db";

const PAGE = PAGE_DIMENSIONS[DEFAULT_PAGE_FORMAT];

export interface CollectionPlate {
  id: string;
  handle: string;
  grade: PlateGrade;
  dpi: number;
}

export interface CollectionReadiness {
  total: number;
  ok: number;
  marginal: number;
  rejected: number;
  plates: CollectionPlate[];
}

function assess(width: number | null, height: number | null) {
  if (!width || !height) {
    return { grade: "REJECT" as PlateGrade, dpi: 0 };
  }
  const input = {
    imageWidthPx: width,
    imageHeightPx: height,
    orientation: orientationFromPixels(width, height),
    page: PAGE,
    hasCaption: true,
  };
  return { grade: gradePlate(input), dpi: Math.round(plateDpi(input)) };
}

/** What this collection would look like in print, before anyone commits to it. */
export async function assessCollection(
  token: string,
): Promise<CollectionReadiness | null> {
  const collection = await db.collection.findUnique({
    where: { token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!collection) return null;

  const plates = collection.items.map((item) => {
    const { grade, dpi } = assess(item.width, item.height);
    return { id: item.id, handle: item.sourceHandle, grade, dpi };
  });

  return {
    total: plates.length,
    ok: plates.filter((p) => p.grade === "OK").length,
    marginal: plates.filter((p) => p.grade === "MARGINAL").length,
    rejected: plates.filter((p) => p.grade === "REJECT").length,
    plates,
  };
}

function getBookletQueue() {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  return new Queue("booklet-generation", { connection: { url: redisUrl } });
}

/**
 * Turn a collection into a queued booklet job. `keepMarginalIds` is the
 * collector's own answer to "these will look soft — keep or drop?", so a
 * marginal plate is only printed when they said so.
 */
export async function enqueueCollectionBooklet(
  token: string,
  keepMarginalIds: string[],
): Promise<{ printFileId: string; plateCount: number }> {
  const collection = await db.collection.findUnique({
    where: { token },
    include: { items: { orderBy: { createdAt: "asc" } } },
  });
  if (!collection) throw new Error(`Unknown collection token: ${token}`);

  const keep = new Set(keepMarginalIds);
  const plates = collection.items
    .filter((item) => {
      const { grade } = assess(item.width, item.height);
      return grade === "OK" || (grade === "MARGINAL" && keep.has(item.id));
    })
    .map((item) => ({
      id: item.id,
      title: item.caption?.split("\n")[0]?.trim() || null,
      storageKey: item.storageKey,
      mimeType: null,
      width: item.width,
      height: item.height,
      orientation: orientationFromPixels(item.width ?? 1, item.height ?? 1),
      creatorName: `@${item.sourceHandle}`,
    }));

  if (plates.length === 0) {
    throw new Error("Nothing in this collection is printable");
  }

  const printFile = await db.generatedPrintFile.upsert({
    where: { collectionId: collection.id },
    create: { collectionId: collection.id, status: "PENDING" },
    update: { status: "PENDING", errorMessage: null },
  });

  await getBookletQueue().add("generate-booklet", {
    printFileId: printFile.id,
    issueLabel: "Your Collection",
    plates,
  });

  return { printFileId: printFile.id, plateCount: plates.length };
}
```

`mimeType: null` is correct: `artwork-page.service.ts` embeds JPEG unless the
type is exactly `image/png`, and every `CollectedItem` is stored as fetched
bytes from Threads, which serves JPEG and WebP. WebP is a known gap — the
worker cannot embed it, so those plates will fail at embed time. Track that
separately; the demo script transcodes with sharp and the worker will need the
same treatment.

- [ ] **Step 5: Run the test**

Run: `pnpm --filter mvp test lib/collect/__tests__/print-service.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add apps/mvp/package.json apps/mvp/lib/collect/print-service.ts apps/mvp/lib/collect/__tests__/print-service.test.ts
git commit -m "Turn a collection into a booklet job"
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

### Task 8: Show the collector what will print

**Files:**
- Create: `apps/mvp/components/collect/print-readiness.tsx`
- Modify: `apps/mvp/app/c/[token]/print/page.tsx`

**Interfaces:**
- Consumes: `assessCollection`, `CollectionReadiness` from Task 7.
- Produces: `<PrintReadiness readiness={readiness} />`.

- [ ] **Step 1: Write the component**

`apps/mvp/components/collect/print-readiness.tsx`. Server component, no state —
the keep/drop control comes later; this pass makes the tiers visible, which is
what the spec requires before the CTA.

```tsx
import type { CollectionReadiness } from "@/lib/collect/print-service";

export function PrintReadiness({
  readiness,
}: {
  readiness: CollectionReadiness;
}) {
  const { total, ok, marginal, rejected } = readiness;

  return (
    <div className="rounded-md border border-border bg-card p-4 text-sm">
      <p className="font-medium text-foreground">
        {ok + marginal} of {total} pieces are print-ready.
      </p>
      <ul className="mt-2 space-y-1 text-muted-foreground">
        {marginal > 0 && (
          <li>
            {marginal} will look soft at this size — they were posted at a lower
            resolution than print wants.
          </li>
        )}
        {rejected > 0 && (
          <li>
            {rejected} can&apos;t be printed at the resolution the artist posted.
          </li>
        )}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Render it above the CTA**

In `apps/mvp/app/c/[token]/print/page.tsx`, add the import and the call:

```tsx
import { PrintReadiness } from "@/components/collect/print-readiness";
import { assessCollection } from "@/lib/collect/print-service";
```

After `const collection = await getCollectionView(token);` and its `notFound()`
guard, add:

```tsx
  const readiness = await assessCollection(token);
```

Then render `{readiness && <PrintReadiness readiness={readiness} />}`
immediately above the activate/reserve button.

Base the displayed price on what will actually print, not on everything
collected — change the `price` line to:

```tsx
  const printableCount = readiness ? readiness.ok + readiness.marginal : collection.itemCount;
  const price = formatEur(magazinePriceCents(printableCount));
```

- [ ] **Step 3: Check it in a browser**

Run `pnpm dev` and open `http://localhost:3003/c/<token>/print` for a real
collection token. Use the agent-browser CLI to confirm the readout renders and
that the panel is legible in **both** light and dark mode — it uses semantic
tokens, so it should be, but verify rather than assume.

- [ ] **Step 4: Typecheck, format, full mvp tests**

Run: `pnpm --filter mvp typecheck && pnpm --filter mvp lint:format && pnpm --filter mvp test`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/mvp/components/collect/print-readiness.tsx "apps/mvp/app/c/[token]/print/page.tsx"
git commit -m "Say which collected pieces will actually print

The tiered floor is only honest if the collector can see it before they
commit — and the price should follow the printable count, not the
collected count."
git checkout -- pnpm-lock.yaml 2>/dev/null || true
```

---

## Verification

After Task 8, the whole thing must hold together:

```bash
pnpm --filter @printfeed/print-geometry test
pnpm --filter pdf-worker test
pnpm --filter pdf-worker typecheck
pnpm --filter mvp test
pnpm --filter mvp typecheck
docker build -f Dockerfile.pdf-worker -t pdf-worker-check .
```

The load-bearing assertion across all of it: **the existing cycle specs are
still green.** They are the evidence that inverting the payload did not break
the production subscription path.

## Known gaps, deliberately left

- **WebP plates.** `artwork-page.service.ts` embeds JPEG or PNG only. Threads
  serves plenty of WebP, and `ingest-service` stores bytes as fetched, so some
  `CollectedItem`s will fail at embed. `build-demo-booklet.cts` transcodes with
  sharp; the worker needs the same. Not in this plan — it deserves its own.
- **Keep/drop interaction.** Task 8 shows the tiers; `enqueueCollectionBooklet`
  already accepts `keepMarginalIds`, but nothing yet lets the collector choose.
  Wire it when the proof print says whether marginal plates are worth keeping.
- **Live Peecho order and Stripe charge.** Out of scope by decision.
- **Per-artist cap in the product path.** Only the demo script has one.
