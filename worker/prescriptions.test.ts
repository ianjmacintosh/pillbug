import { describe, expect, test } from "vitest";
import {
  validateSchedule,
  createPrescription,
  updatePrescription,
  deletePrescription,
} from "./prescriptions";
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
    async getPrescription(id, patientId) {
      return (
        prescriptions.find((p) => p.id === id && p.patientId === patientId) ??
        null
      );
    },
    async updatePrescription(id, patientId, fields) {
      const idx = prescriptions.findIndex(
        (p) => p.id === id && p.patientId === patientId,
      );
      if (idx === -1) return null;
      prescriptions[idx] = { ...prescriptions[idx], ...fields };
      return prescriptions[idx];
    },
    async deletePrescription(id, patientId) {
      const idx = prescriptions.findIndex(
        (p) => p.id === id && p.patientId === patientId,
      );
      if (idx === -1) return false;
      prescriptions.splice(idx, 1);
      return true;
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

const BASE_PRESCRIPTION: Prescription = {
  id: "rx-1",
  patientId: "patient-1",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: "daily", times: [], timezoneMode: "local" },
  startDate: "2024-01-01",
  endDate: null,
  prescribingDoctor: null,
  instructions: null,
  status: "active",
  createdAt: "2024-01-01T00:00:00.000Z",
};

describe("deletePrescription", () => {
  test("returns ok when prescription is deleted", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription(BASE_PRESCRIPTION);

    const result = await deletePrescription("rx-1", "patient-1", repo);
    expect(result).toEqual({ ok: true });
  });

  test("returns not_found when prescription does not exist", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await deletePrescription("rx-missing", "patient-1", repo);
    expect(result).toEqual({ error: "not_found" });
  });

  test("returns not_found when prescription belongs to a different patient", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription(BASE_PRESCRIPTION);

    const result = await deletePrescription("rx-1", "patient-other", repo);
    expect(result).toEqual({ error: "not_found" });
  });
});

describe("updatePrescription", () => {
  test("returns updated prescription with only changed fields modified", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription(BASE_PRESCRIPTION);

    const result = await updatePrescription(
      "rx-1",
      "patient-1",
      { dosage: "1000mg" },
      repo,
    );

    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.dosage).toBe("1000mg");
      expect(result.drugName).toBe("Metformin");
    }
  });

  test("returns not_found when prescription does not exist", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await updatePrescription(
      "rx-missing",
      "patient-1",
      { dosage: "1000mg" },
      repo,
    );
    expect(result).toEqual({ error: "not_found" });
  });

  test("returns not_found when prescription belongs to a different patient", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription(BASE_PRESCRIPTION);

    const result = await updatePrescription(
      "rx-1",
      "patient-other",
      { dosage: "1000mg" },
      repo,
    );
    expect(result).toEqual({ error: "not_found" });
  });

  test("rejects when endDate would be before startDate after update", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription({
      ...BASE_PRESCRIPTION,
      startDate: "2024-06-01",
    });

    const result = await updatePrescription(
      "rx-1",
      "patient-1",
      { endDate: "2024-01-01" },
      repo,
    );
    expect(result).toEqual({ error: "end_date_before_start_date" });
  });

  test("rejects an invalid schedule", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    await repo.createPrescription(BASE_PRESCRIPTION);

    const result = await updatePrescription(
      "rx-1",
      "patient-1",
      { schedule: { days: [], times: [], timezoneMode: "local" } },
      repo,
    );
    expect(result).toEqual({ error: "invalid_days" });
  });
});
