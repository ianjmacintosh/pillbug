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
  test("accepts a per-day schedule with HH:MM times", () => {
    expect(
      validateSchedule({
        days: { monday: ["08:00"], wednesday: ["08:00", "20:00"] },
        timezoneMode: "local",
      }),
    ).toBeNull();
  });

  test("accepts an empty days object", () => {
    expect(validateSchedule({ days: {}, timezoneMode: "local" })).toBeNull();
  });

  test("rejects an invalid day key", () => {
    expect(
      validateSchedule({
        days: { funday: ["08:00"] },
        timezoneMode: "local",
      }),
    ).toEqual({ error: "invalid_days" });
  });

  test("rejects a time entry that is not HH:MM", () => {
    expect(
      validateSchedule({
        days: { monday: ["8am"] },
        timezoneMode: "local",
      }),
    ).toEqual({ error: "invalid_time_format" });
  });

  test("rejects a non-object days value", () => {
    expect(validateSchedule({ days: "daily", timezoneMode: "local" })).toEqual({
      error: "invalid_days",
    });
  });
});

describe("createPrescription", () => {
  test("returns a prescription with doseCount and doseForm when provided", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await createPrescription(
      {
        drugName: "Metformin",
        dosage: "500mg",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
        doseCount: 2,
        doseForm: "capsule",
      },
      "patient-1",
      repo,
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.doseCount).toBe(2);
      expect(result.doseForm).toBe("capsule");
    }
  });

  test("defaults doseCount to 1 and doseForm to tablet when not provided", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await createPrescription(
      {
        drugName: "Metformin",
        dosage: "500mg",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
        startDate: "2024-01-01",
      },
      "patient-1",
      repo,
    );
    expect("error" in result).toBe(false);
    if (!("error" in result)) {
      expect(result.doseCount).toBe(1);
      expect(result.doseForm).toBe("tablet");
    }
  });

  test("returns a prescription with a generated id and active status", async () => {
    const repo = makeInMemoryPrescriptionRepo();
    const result = await createPrescription(
      {
        drugName: "Metformin",
        dosage: "500mg",
        schedule: { days: { monday: ["08:00"] }, timezoneMode: "local" },
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
        schedule: { days: {}, timezoneMode: "local" },
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
  doseCount: 1,
  doseForm: "tablet",
  drugName: "Metformin",
  dosage: "500mg",
  schedule: { days: {}, timezoneMode: "local" },
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
      {
        schedule: {
          days: { funday: ["08:00"] } as never,
          timezoneMode: "local",
        },
      },
      repo,
    );
    expect(result).toEqual({ error: "invalid_days" });
  });
});
