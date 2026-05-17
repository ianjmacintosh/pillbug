import { describe, expect, test } from "vitest";
import { validateSchedule, createPrescription } from "./prescriptions";
import type { Prescription, PrescriptionRepository } from "./prescriptions";

function makeInMemoryPrescriptionRepo(): PrescriptionRepository & {
  prescriptions: Prescription[];
} {
  const prescriptions: Prescription[] = [];
  return {
    prescriptions,
    async createPrescription(p) {
      prescriptions.push(p);
    },
    async listPrescriptions(patientId, statusFilter) {
      return prescriptions.filter(
        (p) => p.patientId === patientId && statusFilter.includes(p.status),
      );
    },
  };
}

describe("validateSchedule", () => {
  test("accepts a daily timeless schedule", () => {
    expect(
      validateSchedule({ days: "daily", times: [], timezoneMode: "local" }),
    ).toBeNull();
  });

  test("accepts specific weekdays", () => {
    expect(
      validateSchedule({
        days: ["monday", "wednesday", "friday"],
        times: [],
        timezoneMode: "local",
      }),
    ).toBeNull();
  });

  test("rejects an empty days array", () => {
    expect(
      validateSchedule({ days: [], times: [], timezoneMode: "local" }),
    ).toEqual({ error: "invalid_days" });
  });

  test("rejects an unrecognized days string", () => {
    expect(
      validateSchedule({ days: "weekly", times: [], timezoneMode: "local" }),
    ).toEqual({ error: "invalid_days" });
  });

  test("rejects an array containing an invalid weekday", () => {
    expect(
      validateSchedule({
        days: ["monday", "saturday", "funday"],
        times: [],
        timezoneMode: "local",
      }),
    ).toEqual({ error: "invalid_days" });
  });

  test("rejects a time entry that is not HH:MM", () => {
    expect(
      validateSchedule({
        days: "daily",
        times: ["8am"],
        timezoneMode: "local",
      }),
    ).toEqual({ error: "invalid_time_format" });
  });
});

describe("createPrescription", () => {
  test("returns a prescription with a generated id and active status", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await createPrescription(
      {
        drugName: "Metformin",
        dosage: "500mg",
        schedule: { days: "daily", times: [], timezoneMode: "local" },
        startDate: "2024-01-01",
      },
      "patient-1",
      repo,
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.id).toBeTypeOf("string");
      expect(result.status).toBe("active");
      expect(result.drugName).toBe("Metformin");
      expect(result.patientId).toBe("patient-1");
    }
  });

  test("rejects when endDate is before startDate", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await createPrescription(
      {
        drugName: "Metformin",
        dosage: "500mg",
        schedule: { days: "daily", times: [], timezoneMode: "local" },
        startDate: "2024-06-01",
        endDate: "2024-01-01",
      },
      "patient-1",
      repo,
    );
    expect(result).toEqual({ error: "end_date_before_start_date" });
  });
});
