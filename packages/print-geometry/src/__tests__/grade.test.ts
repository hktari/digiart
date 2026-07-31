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
    // being under a full-bleed 300dpi floor. Drawn inside the margin, as the
    // renderer has always drawn it, the plate is comfortably past 300.
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
