import { describe, expect, test } from "vitest";
import { parseScheduleJson } from "./d1-prescriptions-repo";

describe("parseScheduleJson", () => {
  test("passes through a new-format schedule unchanged", () => {
    const schedule = {
      days: { monday: ["08:00"], wednesday: ["20:00"] },
      timezoneMode: "local",
    };
    expect(parseScheduleJson(JSON.stringify(schedule))).toEqual(schedule);
  });

  test("converts legacy daily+times schedule to per-day format", () => {
    const legacy = {
      days: "daily",
      times: ["08:00", "20:00"],
      timezoneMode: "local",
    };
    const result = parseScheduleJson(JSON.stringify(legacy));
    expect(result.days).toEqual({
      sunday: ["08:00", "20:00"],
      monday: ["08:00", "20:00"],
      tuesday: ["08:00", "20:00"],
      wednesday: ["08:00", "20:00"],
      thursday: ["08:00", "20:00"],
      friday: ["08:00", "20:00"],
      saturday: ["08:00", "20:00"],
    });
    expect(result.timezoneMode).toBe("local");
  });

  test("converts legacy weekday-array+times schedule to per-day format", () => {
    const legacy = {
      days: ["monday", "wednesday", "friday"],
      times: ["20:00"],
      timezoneMode: "local",
    };
    const result = parseScheduleJson(JSON.stringify(legacy));
    expect(result.days).toEqual({
      monday: ["20:00"],
      wednesday: ["20:00"],
      friday: ["20:00"],
    });
  });

  test("converts legacy daily+empty-times to all days with no times", () => {
    const legacy = { days: "daily", times: [], timezoneMode: "local" };
    const result = parseScheduleJson(JSON.stringify(legacy));
    expect(result.days).toEqual({
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    });
  });
});
