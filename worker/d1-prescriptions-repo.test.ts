import { describe, expect, test } from "vitest";
import { parseScheduleJson } from "./d1-prescriptions-repo";

describe("parseScheduleJson", () => {
  test("passes through a new-format schedule unchanged", () => {
    const schedule = {
      days: {
        monday: [{ time: "08:00", quantity: 1 }],
        wednesday: [{ time: "20:00", quantity: 2 }],
      },
      timezoneMode: "local",
    };
    expect(parseScheduleJson(JSON.stringify(schedule))).toEqual(schedule);
  });

  test("converts legacy daily+times schedule to per-day {time, quantity} format", () => {
    const legacy = {
      days: "daily",
      times: ["08:00", "20:00"],
      timezoneMode: "local",
    };
    const result = parseScheduleJson(JSON.stringify(legacy));
    const expectedSlots = [
      { time: "08:00", quantity: 1 },
      { time: "20:00", quantity: 1 },
    ];
    expect(result.days).toEqual({
      sunday: expectedSlots,
      monday: expectedSlots,
      tuesday: expectedSlots,
      wednesday: expectedSlots,
      thursday: expectedSlots,
      friday: expectedSlots,
      saturday: expectedSlots,
    });
    expect(result.timezoneMode).toBe("local");
  });

  test("converts legacy weekday-array+times schedule to per-day {time, quantity} format", () => {
    const legacy = {
      days: ["monday", "wednesday", "friday"],
      times: ["20:00"],
      timezoneMode: "local",
    };
    const result = parseScheduleJson(JSON.stringify(legacy));
    expect(result.days).toEqual({
      monday: [{ time: "20:00", quantity: 1 }],
      wednesday: [{ time: "20:00", quantity: 1 }],
      friday: [{ time: "20:00", quantity: 1 }],
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
