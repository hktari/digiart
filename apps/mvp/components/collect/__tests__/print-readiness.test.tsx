import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionReadiness } from "@/lib/collect/print-service";
import { PrintReadiness } from "../print-readiness";

function readiness(
  over: Partial<CollectionReadiness> = {},
): CollectionReadiness {
  return {
    total: 0,
    ok: 0,
    marginal: 0,
    rejected: 0,
    printing: 0,
    heldBack: 0,
    perArtist: 2,
    artists: 0,
    plates: [],
    ...over,
  };
}

describe("PrintReadiness", () => {
  it("reports the printing count, the cap and the two ways a piece drops out", () => {
    render(
      <PrintReadiness
        readiness={readiness({
          total: 108,
          ok: 78,
          marginal: 9,
          rejected: 21,
          printing: 39,
          heldBack: 48,
          artists: 25,
        })}
      />,
    );

    expect(
      screen.getByText(/39 of 108 pieces will print, from 25 artists/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/48 more are print-ready but held back/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/2 per artist/i)).toBeInTheDocument();
    expect(screen.getByText(/9 would look soft/i)).toBeInTheDocument();
    expect(screen.getByText(/21 can't be printed/i)).toBeInTheDocument();
  });

  it("says nothing extra when every piece is fine and nothing is capped", () => {
    render(
      <PrintReadiness
        readiness={readiness({ total: 4, ok: 4, printing: 4, artists: 3 })}
      />,
    );

    expect(screen.getByText(/4 of 4 pieces will print/i)).toBeInTheDocument();
    expect(screen.queryByText(/look soft/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/can't be printed/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/held back/i)).not.toBeInTheDocument();
  });

  it("renders nothing for an empty collection", () => {
    const { container } = render(<PrintReadiness readiness={readiness()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
