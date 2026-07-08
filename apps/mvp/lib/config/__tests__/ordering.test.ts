import { afterEach, describe, expect, it } from "vitest";
import { isOrderingEnabled } from "../ordering";

const KEY = "NEXT_PUBLIC_ORDERING_ENABLED";

describe("isOrderingEnabled", () => {
  const original = process.env[KEY];

  afterEach(() => {
    if (original === undefined) delete process.env[KEY];
    else process.env[KEY] = original;
  });

  it("is enabled when the var is unset", () => {
    delete process.env[KEY];
    expect(isOrderingEnabled()).toBe(true);
  });

  it("is enabled when the var is 'true'", () => {
    process.env[KEY] = "true";
    expect(isOrderingEnabled()).toBe(true);
  });

  it("is disabled only for the literal 'false'", () => {
    process.env[KEY] = "false";
    expect(isOrderingEnabled()).toBe(false);
  });

  it("treats any other value as enabled (fail-open)", () => {
    process.env[KEY] = "no";
    expect(isOrderingEnabled()).toBe(true);
  });
});
