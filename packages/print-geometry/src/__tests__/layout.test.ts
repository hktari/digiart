import { describe, expect, it } from "vitest";
import { layoutPlate, orientationFromPixels } from "../layout";
import { PAGE_DIMENSIONS } from "../page";

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
    // Never into the margin, never wider than the print area.
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
    expect(layout.scale).toBeCloseTo(0.2065054, 6);
  });
});
