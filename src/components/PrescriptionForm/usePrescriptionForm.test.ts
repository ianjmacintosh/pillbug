import { describe, expect, test } from "vitest";
import { initSchedules, buildSchedule } from "./usePrescriptionForm";
import type { PrescriptionFormData } from "./PrescriptionForm.types";

const BASE: PrescriptionFormData = {
  id: "rx-1",
  doseForm: "tablet",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: {} },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
};

describe("initSchedules", () => {
  test("returns one schedule with a default time slot when no prescription given", () => {
    const result = initSchedules();
    expect(result).toHaveLength(1);
    expect(result[0].days.size).toBe(0);
    expect(result[0].times).toEqual([{ time: "09:00", quantity: "1" }]);
    expect(result[0].daysError).toBe(false);
    expect(result[0].timesError).toBe(false);
  });

  test("returns one empty schedule when prescription has no scheduled days", () => {
    const result = initSchedules({ ...BASE, schedule: { days: {} } });
    expect(result).toHaveLength(1);
    expect(result[0].days.size).toBe(0);
    expect(result[0].times).toHaveLength(0);
  });

  test("groups days that share the same times into one schedule", () => {
    const rx: PrescriptionFormData = {
      ...BASE,
      schedule: {
        days: {
          monday: [{ time: "08:00", quantity: 1 }],
          wednesday: [{ time: "08:00", quantity: 1 }],
          friday: [{ time: "08:00", quantity: 1 }],
        },
      },
    };
    const result = initSchedules(rx);
    expect(result).toHaveLength(1);
    expect(result[0].days).toEqual(new Set(["monday", "wednesday", "friday"]));
    expect(result[0].times).toEqual([{ time: "08:00", quantity: "1" }]);
  });

  test("creates separate schedules for days with different times", () => {
    const rx: PrescriptionFormData = {
      ...BASE,
      schedule: {
        days: {
          monday: [{ time: "08:00", quantity: 1 }],
          friday: [{ time: "20:00", quantity: 2 }],
        },
      },
    };
    const result = initSchedules(rx);
    expect(result).toHaveLength(2);
    const monday = result.find((s) => s.days.has("monday"));
    const friday = result.find((s) => s.days.has("friday"));
    expect(monday?.times).toEqual([{ time: "08:00", quantity: "1" }]);
    expect(friday?.times).toEqual([{ time: "20:00", quantity: "2" }]);
  });

  test("maps quantity to a string for form editing", () => {
    const rx: PrescriptionFormData = {
      ...BASE,
      schedule: {
        days: { monday: [{ time: "08:00", quantity: 2 }] },
      },
    };
    const result = initSchedules(rx);
    expect(result[0].times[0].quantity).toBe("2");
  });

  test("sorts times within a schedule in ascending order", () => {
    const rx: PrescriptionFormData = {
      ...BASE,
      schedule: {
        days: {
          monday: [
            { time: "20:00", quantity: 1 },
            { time: "08:00", quantity: 1 },
          ],
        },
      },
    };
    const result = initSchedules(rx);
    expect(result[0].times.map((s) => s.time)).toEqual(["08:00", "20:00"]);
  });

  test("skips days with empty slot arrays", () => {
    const rx: PrescriptionFormData = {
      ...BASE,
      schedule: {
        days: {
          monday: [],
          wednesday: [{ time: "08:00", quantity: 1 }],
        },
      },
    };
    const result = initSchedules(rx);
    expect(result).toHaveLength(1);
    expect(result[0].days.has("monday")).toBe(false);
    expect(result[0].days.has("wednesday")).toBe(true);
  });
});

describe("buildSchedule", () => {
  test("returns empty days when no schedules have selected days", () => {
    const schedules = [
      {
        days: new Set<"monday">(),
        times: [{ time: "09:00", quantity: "1" }],
        daysError: false,
        timesError: false,
      },
    ];
    expect(buildSchedule(schedules)).toEqual({ days: {} });
  });

  test("converts string quantities to numbers", () => {
    const schedules = [
      {
        days: new Set(["monday"] as const),
        times: [{ time: "08:00", quantity: "2" }],
        daysError: false,
        timesError: false,
      },
    ];
    const result = buildSchedule(schedules);
    expect(result.days.monday?.[0].quantity).toBe(2);
  });

  test("defaults quantity to 1 when quantity string is non-numeric", () => {
    const schedules = [
      {
        days: new Set(["monday"] as const),
        times: [{ time: "08:00", quantity: "" }],
        daysError: false,
        timesError: false,
      },
    ];
    const result = buildSchedule(schedules);
    expect(result.days.monday?.[0].quantity).toBe(1);
  });

  test("assigns the same times to each day in a schedule", () => {
    const schedules = [
      {
        days: new Set(["monday", "wednesday"] as const),
        times: [{ time: "08:00", quantity: "1" }],
        daysError: false,
        timesError: false,
      },
    ];
    const result = buildSchedule(schedules);
    expect(result.days.monday).toEqual([{ time: "08:00", quantity: 1 }]);
    expect(result.days.wednesday).toEqual([{ time: "08:00", quantity: 1 }]);
  });
});

describe("initSchedules → buildSchedule round-trip", () => {
  test("reconstructs a single-day schedule exactly", () => {
    const original: PrescriptionFormData["schedule"] = {
      days: { monday: [{ time: "08:00", quantity: 1 }] },
    };
    const rx = { ...BASE, schedule: original };
    expect(buildSchedule(initSchedules(rx))).toEqual(original);
  });

  test("reconstructs a multi-day same-time schedule exactly", () => {
    const original: PrescriptionFormData["schedule"] = {
      days: {
        monday: [{ time: "08:00", quantity: 1 }],
        wednesday: [{ time: "08:00", quantity: 1 }],
        friday: [{ time: "08:00", quantity: 1 }],
      },
    };
    const rx = { ...BASE, schedule: original };
    expect(buildSchedule(initSchedules(rx))).toEqual(original);
  });

  test("reconstructs a schedule with multiple times per day exactly", () => {
    const original: PrescriptionFormData["schedule"] = {
      days: {
        monday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 2 },
        ],
      },
    };
    const rx = { ...BASE, schedule: original };
    expect(buildSchedule(initSchedules(rx))).toEqual(original);
  });

  test("reconstructs a schedule with different times on different days", () => {
    const original: PrescriptionFormData["schedule"] = {
      days: {
        monday: [{ time: "08:00", quantity: 1 }],
        friday: [{ time: "20:00", quantity: 2 }],
      },
    };
    const rx = { ...BASE, schedule: original };
    expect(buildSchedule(initSchedules(rx))).toEqual(original);
  });
});
