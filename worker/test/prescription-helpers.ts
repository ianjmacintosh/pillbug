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
