import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionReadiness } from "@/lib/collect/print-service";
import { PrintReadiness } from "../print-readiness";

function readiness(
  over: Partial<CollectionReadiness> = {},
): CollectionReadiness {
  return { total: 0, ok: 0, marginal: 0, rejected: 0, plates: [], ...over };
}

describe("PrintReadiness", () => {
  it("counts marginal plates as printing, because they do", () => {
    render(
      <PrintReadiness
        readiness={readiness({ total: 31, ok: 20, marginal: 3, rejected: 8 })}
      />,
    );

    expect(screen.getByText(/23 of 31 pieces will print/i)).toBeInTheDocument();
    expect(screen.getByText(/3 will look soft/i)).toBeInTheDocument();
    expect(screen.getByText(/8 can't be printed/i)).toBeInTheDocument();
  });

  it("says nothing about tiers when every piece is fine", () => {
    render(<PrintReadiness readiness={readiness({ total: 4, ok: 4 })} />);

    expect(screen.getByText(/4 of 4 pieces will print/i)).toBeInTheDocument();
    expect(screen.queryByText(/look soft/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/can't be printed/i)).not.toBeInTheDocument();
  });

  it("renders nothing for an empty collection", () => {
    const { container } = render(<PrintReadiness readiness={readiness()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
