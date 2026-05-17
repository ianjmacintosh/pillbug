import type { Prescription, PrescriptionRepository } from "../prescriptions";

export function makeInMemoryPrescriptionRepo(): PrescriptionRepository {
  const prescriptions: Prescription[] = [];
  return {
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
