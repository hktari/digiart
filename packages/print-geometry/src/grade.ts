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
 * Expect to revise both once a proof copy has been held in hand.
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
