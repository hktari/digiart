import { type PlateInput } from "./layout";
/** At or above this, a plate prints without comment. */
export declare const PRINT_DPI_FLOOR = 250;
/**
 * Between this and the floor a plate still prints, but the collector is told
 * it will look soft and can drop it. Below it, the plate is dropped.
 *
 * Peecho's own published guidance is >=150dpi for images and 220dpi for
 * text-heavy documents. These sit above that deliberately: the printer's
 * minimum is what it will accept, not what we are willing to put our name on.
 * Expect to revise both once a proof copy has been held in hand.
 */
export declare const PRINT_DPI_WARN = 200;
export type PlateGrade = "OK" | "MARGINAL" | "REJECT";
/** Effective resolution of a plate as the renderer will place it, in dpi. */
export declare function plateDpi(input: PlateInput): number;
export declare function gradePlate(input: PlateInput): PlateGrade;
//# sourceMappingURL=grade.d.ts.map