import { describe, expect, test } from "vitest";
import { scheduledDoses } from "./scheduled-doses";
import type { Dose } from "./doses";
import type { Prescription } from "./prescriptions";

const BASE_PRESCRIPTION: Prescription = {
  id: "rx-1",
  patientId: "patient-1",
  doseForm: "tablet",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: {
    days: {
      monday: [{ time: "08:00", quantity: 1 }],
      wednesday: [{ time: "08:00", quantity: 1 }],
    },
  },
  startDate: "2024-03-11",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const WEEK_START = "2024-03-11";
const WEEK_END = "2024-03-17";
const TODAY = "2024-03-17";

describe("scheduledDoses", () => {
  test("returns empty array for empty prescriptions list", () => {
    expect(scheduledDoses([], WEEK_START, WEEK_END, TODAY, [], "UTC")).toEqual(
      [],
    );
  });

  test("only generates doses from a prescription's start date onward", () => {
    const rx: Prescription = {
      ...BASE_PRESCRIPTION,
      startDate: "2024-03-13",
    };
    const result = scheduledDoses([rx], WEEK_START, WEEK_END, TODAY, [], "UTC");
    const dates = result.map((d) => d.scheduledAt.slice(0, 10));
    expect(dates).not.toContain("2024-03-11");
    expect(dates).toContain("2024-03-13");
  });

  test("only generates doses up to a prescription's end date", () => {
    const rx: Prescription = {
      ...BASE_PRESCRIPTION,
      schedule: {
        days: {
          monday: [{ time: "08:00", quantity: 1 }],
          wednesday: [{ time: "08:00", quantity: 1 }],
          friday: [{ time: "08:00", quantity: 1 }],
        },
      },
      endDate: "2024-03-13",
    };
    const result = scheduledDoses([rx], WEEK_START, WEEK_END, TODAY, [], "UTC");
    const dates = result.map((d) => d.scheduledAt.slice(0, 10));
    expect(dates).toContain("2024-03-11");
    expect(dates).toContain("2024-03-13");
    expect(dates).not.toContain("2024-03-15");
  });

  test("generates doses from multiple prescriptions", () => {
    const rx2: Prescription = {
      ...BASE_PRESCRIPTION,
      id: "rx-2",
      drugName: "Lisinopril",
      schedule: {
        days: { tuesday: [{ time: "12:00", quantity: 1 }] },
      },
    };
    const result = scheduledDoses(
      [BASE_PRESCRIPTION, rx2],
      WEEK_START,
      WEEK_END,
      TODAY,
      [],
      "UTC",
    );
    const ids = result.map((d) => d.prescriptionId);
    expect(ids).toContain("rx-1");
    expect(ids).toContain("rx-2");
  });

  test("marks a scheduled dose as resolved when a matching dose exists", () => {
    const loggedDose: Dose = {
      id: "dose-1",
      patientId: "patient-1",
      prescriptionId: "rx-1",
      scheduledAt: "2024-03-11T08:00:00.000Z",
      status: "taken",
      loggedAt: "2024-03-11T08:05:00.000Z",
      createdAt: "2024-03-11T08:05:00.000Z",
    };
    const result = scheduledDoses(
      [BASE_PRESCRIPTION],
      WEEK_START,
      WEEK_END,
      TODAY,
      [loggedDose],
      "UTC",
    );
    const monday = result.find(
      (d) => d.scheduledAt === "2024-03-11T08:00:00.000Z",
    );
    expect(monday?.resolvedDose).toEqual({ id: "dose-1", status: "taken" });
  });

  test("marks future days as non-actionable and past days as actionable", () => {
    const rx: Prescription = {
      ...BASE_PRESCRIPTION,
      schedule: {
        days: {
          monday: [{ time: "08:00", quantity: 1 }],
          friday: [{ time: "08:00", quantity: 1 }],
        },
      },
    };
    const today = "2024-03-13";
    const result = scheduledDoses([rx], WEEK_START, WEEK_END, today, [], "UTC");
    const monday = result.find((d) => d.scheduledAt.startsWith("2024-03-11"));
    const friday = result.find((d) => d.scheduledAt.startsWith("2024-03-15"));
    expect(monday?.actionable).toBe(true);
    expect(friday?.actionable).toBe(false);
  });

  test("non-active prescriptions do not generate doses", () => {
    const rx: Prescription = { ...BASE_PRESCRIPTION, status: "paused" };
    expect(
      scheduledDoses([rx], WEEK_START, WEEK_END, TODAY, [], "UTC"),
    ).toEqual([]);
  });

  test("converts 08:00 wall-clock time to real UTC for America/New_York (UTC-5 in winter)", () => {
    // 2024-01-08 is a Monday in January — New York is firmly UTC-5 (no DST)
    const weekStart = "2024-01-08";
    const weekEnd = "2024-01-14";
    const rx: Prescription = { ...BASE_PRESCRIPTION, startDate: "2024-01-08" };
    const result = scheduledDoses(
      [rx],
      weekStart,
      weekEnd,
      weekEnd,
      [],
      "America/New_York",
    );
    const monday = result.find((d) => d.scheduledAt.startsWith("2024-01-08"));
    expect(monday?.scheduledAt).toBe("2024-01-08T13:00:00.000Z");
  });

  test("logged_at minus scheduled_at gives correct duration for a real-UTC scheduledAt", () => {
    const scheduledAt = "2024-03-11T13:00:00.000Z";
    const loggedAt = "2024-03-11T13:05:00.000Z";
    const durationMs =
      new Date(loggedAt).getTime() - new Date(scheduledAt).getTime();
    expect(durationMs).toBe(300_000);
  });
});
