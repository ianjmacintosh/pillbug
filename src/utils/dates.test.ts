import { describe, expect, test } from "vitest";
import { formatTime } from "./dates";

describe("formatTime", () => {
  const scheduledAt = "2024-03-11T09:00:00Z";
  const timezone = "UTC";

  test("formats time without AM/PM for pt-BR", () => {
    expect(formatTime(scheduledAt, timezone, "pt-BR")).not.toMatch(/AM|PM/);
  });

  test("formats time in 12-hour style for en-US", () => {
    expect(formatTime(scheduledAt, timezone, "en-US")).toBe("9:00 AM");
  });
});
