import { describe, expect, test } from "vitest";
import { addDays, formatMonthDay, formatTime } from "./dates";

describe("addDays", () => {
  test("adds positive days", () => {
    expect(addDays("2024-03-11", 3)).toBe("2024-03-14");
  });

  test("rolls over month boundary", () => {
    expect(addDays("2024-03-30", 2)).toBe("2024-04-01");
  });

  test("adds zero days returns same date", () => {
    expect(addDays("2024-03-11", 0)).toBe("2024-03-11");
  });
});

describe("formatMonthDay", () => {
  test("formats for en-US", () => {
    expect(formatMonthDay("2024-03-11", "en-US")).toBe("Mar 11");
  });

  test("formats for pt-BR", () => {
    expect(formatMonthDay("2024-03-11", "pt-BR")).toMatch(/mar/i);
  });
});

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
