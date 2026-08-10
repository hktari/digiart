import { describe, expect, it } from "vitest";
import { encodeCallback, parseCallback } from "../src/bot/callback-data.js";

describe("callback data", () => {
  it("round-trips without a card message id", () => {
    expect(parseCallback(encodeCallback("draft", "clx123abc"))).toEqual({
      action: "draft",
      leadId: "clx123abc",
      cardMessageId: undefined,
    });
  });

  it("round-trips with a card message id", () => {
    expect(
      parseCallback(encodeCallback("contacted", "clx123abc", 4242)),
    ).toEqual({
      action: "contacted",
      leadId: "clx123abc",
      cardMessageId: 4242,
    });
  });

  it("stays within Telegram's 64-byte callback_data limit", () => {
    const encoded = encodeCallback("regenerate", "c".repeat(25), 9999999);
    expect(Buffer.byteLength(encoded, "utf8")).toBeLessThanOrEqual(64);
  });

  it.each([
    ["", "empty"],
    ["draft", "no lead id"],
    ["explode:clx1", "unknown action"],
    ["draft:", "blank lead id"],
    ["draft:clx1:notanumber", "bad message id"],
    ["draft:clx1:1:2", "too many fields"],
  ])("returns null for %s (%s)", (input) => {
    expect(parseCallback(input)).toBeNull();
  });
});
