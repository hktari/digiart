import { describe, expect, it } from "vitest";
import { ConfigSchema } from "../src/utils/config.js";

const base = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  FIREWORKS_API_KEY: "fw_test",
  TELEGRAM_BOT_TOKEN: "123:abc",
  TELEGRAM_CHAT_ID: "-1003966791760",
};

describe("ConfigSchema", () => {
  it("defaults the card threshold and cap", () => {
    const config = ConfigSchema.parse(base);
    expect(config.LEAD_CARD_MIN_SCORE).toBe(60);
    expect(config.LEAD_CARD_DAILY_CAP).toBe(10);
  });

  it("leaves topic IDs undefined when unset", () => {
    const config = ConfigSchema.parse(base);
    expect(config.TELEGRAM_TOPIC_LEADS).toBeUndefined();
    expect(config.TELEGRAM_TOPIC_STATUS).toBeUndefined();
  });

  it("coerces topic IDs from env strings to numbers", () => {
    const config = ConfigSchema.parse({
      ...base,
      TELEGRAM_TOPIC_LEADS: "12",
      TELEGRAM_TOPIC_STATUS: "7",
    });
    expect(config.TELEGRAM_TOPIC_LEADS).toBe(12);
    expect(config.TELEGRAM_TOPIC_STATUS).toBe(7);
  });

  it("rejects a non-numeric topic ID", () => {
    expect(() =>
      ConfigSchema.parse({ ...base, TELEGRAM_TOPIC_STATUS: "General" }),
    ).toThrow();
  });
});
