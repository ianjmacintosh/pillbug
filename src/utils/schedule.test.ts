import { describe, expect, test } from "vitest";
import { buildScheduleSummary } from "./schedule";
import type { Schedule } from "../../shared/schedule";

// Simple mock t() that handles the keys buildScheduleSummary uses
function t(key: string, options?: Record<string, unknown>): string {
  const map: Record<string, string> = {
    "prescriptionDetail.scheduleDaily": "Daily",
    "days.abbr.sunday": "Sun",
    "days.abbr.monday": "Mon",
    "days.abbr.tuesday": "Tue",
    "days.abbr.wednesday": "Wed",
    "days.abbr.thursday": "Thu",
    "days.abbr.friday": "Fri",
    "days.abbr.saturday": "Sat",
    "prescriptionList.complexSchedule": `Complex schedule (${options?.days})`,
    "prescriptionList.scheduleDoses": `${options?.days}: ${options?.count} doses`,
  };
  return map[key] ?? key;
}

const LANG = "en-US";

function schedule(days: Schedule["days"]): Schedule {
  return { days };
}

describe("buildScheduleSummary", () => {
  test("daily single time → 'Daily: 8:00 AM'", () => {
    const s = schedule({
      sunday: [{ time: "08:00", quantity: 1 }],
      monday: [{ time: "08:00", quantity: 1 }],
      tuesday: [{ time: "08:00", quantity: 1 }],
      wednesday: [{ time: "08:00", quantity: 1 }],
      thursday: [{ time: "08:00", quantity: 1 }],
      friday: [{ time: "08:00", quantity: 1 }],
      saturday: [{ time: "08:00", quantity: 1 }],
    });
    expect(buildScheduleSummary(s, t, LANG)).toBe("Daily: 8:00 AM");
  });

  test("specific days single time → 'Mon/Wed/Fri: 8:00 AM'", () => {
    const s = schedule({
      monday: [{ time: "08:00", quantity: 1 }],
      wednesday: [{ time: "08:00", quantity: 1 }],
      friday: [{ time: "08:00", quantity: 1 }],
    });
    expect(buildScheduleSummary(s, t, LANG)).toBe("Mon/Wed/Fri: 8:00 AM");
  });

  test("daily two times within limit → 'Daily: 8:00 AM & 8:00 PM'", () => {
    const s = schedule({
      sunday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      monday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      tuesday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      wednesday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      thursday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      friday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      saturday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
    });
    expect(buildScheduleSummary(s, t, LANG)).toBe("Daily: 8:00 AM & 8:00 PM");
  });

  // "Mon/Wed/Fri: 8:00 AM & 12:00 PM" = 31 chars → over limit
  test("summary over 30 chars → 'Mon/Wed/Fri: 2 doses'", () => {
    const s = schedule({
      monday: [
        { time: "08:00", quantity: 1 },
        { time: "12:00", quantity: 1 },
      ],
      wednesday: [
        { time: "08:00", quantity: 1 },
        { time: "12:00", quantity: 1 },
      ],
      friday: [
        { time: "08:00", quantity: 1 },
        { time: "12:00", quantity: 1 },
      ],
    });
    expect(buildScheduleSummary(s, t, LANG)).toBe("Mon/Wed/Fri: 2 doses");
  });

  test("multiple routines (different times on different days) → 'Complex schedule (Mon/Tue)'", () => {
    const s = schedule({
      monday: [{ time: "08:00", quantity: 1 }],
      tuesday: [{ time: "14:00", quantity: 1 }],
    });
    expect(buildScheduleSummary(s, t, LANG)).toBe("Complex schedule (Mon/Tue)");
  });
});
