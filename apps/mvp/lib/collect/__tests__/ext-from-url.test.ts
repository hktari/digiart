import { describe, expect, it } from "vitest";
import { extFromUrl } from "../ingest-service";

describe("extFromUrl", () => {
  it("reads a known image extension", () => {
    expect(extFromUrl("https://cdn/a_n.webp?oe=1")).toBe("webp");
    expect(extFromUrl("https://cdn/a_n.png?x=1")).toBe("png");
    expect(extFromUrl("https://cdn/a_n.jpeg")).toBe("jpeg");
  });

  it("defaults to jpg for unknown/missing extensions", () => {
    expect(extFromUrl("https://cdn/weird?x=1")).toBe("jpg");
    expect(extFromUrl("https://cdn/a_n.gif?x=1")).toBe("jpg");
  });
});
