import { useState } from "react";
import type { DayOfWeek } from "../../utils/constants";
import { WEEKDAYS } from "../../utils/constants";
import type { DosageUnit } from "./PrescriptionForm.helpers";
import { parseDosage } from "./PrescriptionForm.helpers";
import type { PrescriptionFormData } from "./PrescriptionForm.types";

export interface TimeSlot {
  time: string;
  quantity: string;
}

export interface DosingSchedule {
  days: Set<DayOfWeek>;
  times: TimeSlot[];
  daysError: boolean;
  timesError: boolean;
}

export function initSchedules(
  prescription?: PrescriptionFormData,
): DosingSchedule[] {
  if (!prescription) {
    return [
      {
        days: new Set(),
        times: [{ time: "09:00", quantity: "1" }],
        daysError: false,
        timesError: false,
      },
    ];
  }

  const bySignature = new Map<string, DosingSchedule>();
  for (const [day, slots] of Object.entries(prescription.schedule.days)) {
    if (!slots || slots.length === 0) continue;
    const sig = JSON.stringify([...slots].map((s) => s.time).sort());
    if (!bySignature.has(sig)) {
      bySignature.set(sig, {
        days: new Set(),
        times: [...slots]
          .sort((a, b) => a.time.localeCompare(b.time))
          .map((slot) => ({
            time: slot.time,
            quantity: String(slot.quantity),
          })),
        daysError: false,
        timesError: false,
      });
    }
    bySignature.get(sig)!.days.add(day as DayOfWeek);
  }

  const schedules = Array.from(bySignature.values());
  return schedules.length > 0
    ? schedules
    : [
        {
          days: new Set(),
          times: [],
          daysError: false,
          timesError: false,
        },
      ];
}

export function usePrescriptionForm(prescription?: PrescriptionFormData) {
  const [doseForm, setDoseForm] = useState(() =>
    prescription ? (prescription.doseForm ?? "tablet") : "tablet",
  );
  const [drugName, setDrugName] = useState(() =>
    prescription ? prescription.drugName : "",
  );
  const [dosageQuantity, setDosageQuantity] = useState(() => {
    if (!prescription) return "";
    const parsed = parseDosage(prescription.dosage);
    return parsed ? parsed.quantity : "";
  });
  const [dosageUnit, setDosageUnit] = useState<DosageUnit | "">(() => {
    if (!prescription) return "mg";
    const parsed = parseDosage(prescription.dosage);
    return parsed ? parsed.unit : "";
  });
  const [dosageFallback, setDosageFallback] = useState<string | null>(() => {
    if (!prescription) return null;
    return parseDosage(prescription.dosage) ? null : prescription.dosage;
  });
  const [startDate, setStartDate] = useState(() =>
    prescription
      ? prescription.startDate
      : new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(() =>
    prescription ? (prescription.endDate ?? "") : "",
  );
  const [instructions, setInstructions] = useState(() =>
    prescription ? (prescription.instructions ?? "") : "",
  );
  const [schedules, setSchedules] = useState<DosingSchedule[]>(() =>
    initSchedules(prescription),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedDuplicateUnit, setDetectedDuplicateUnit] =
    useState<DosageUnit | null>(null);

  function buildDosage(): string {
    if (dosageFallback !== null) return dosageFallback;
    return dosageUnit === ""
      ? dosageQuantity
      : `${dosageQuantity} ${dosageUnit}`;
  }

  function buildSchedule() {
    const days: Partial<
      Record<DayOfWeek, { time: string; quantity: number }[]>
    > = {};
    for (const schedule of schedules) {
      for (const day of schedule.days) {
        days[day] = schedule.times.map((slot) => ({
          time: slot.time,
          quantity: parseFloat(slot.quantity) || 1,
        }));
      }
    }
    return { days };
  }

  function validateSchedule(): boolean {
    const next = schedules.map((s) => ({
      ...s,
      daysError: s.days.size === 0,
      timesError:
        s.times.length === 0 || s.times.some((slot) => slot.time === ""),
    }));
    setSchedules(next);
    return next.every((s) => !s.daysError && !s.timesError);
  }

  function addSchedule() {
    setSchedules((prev) => [
      ...prev,
      {
        days: new Set(),
        times: [{ time: "09:00", quantity: "1" }],
        daysError: false,
        timesError: false,
      },
    ]);
  }

  function removeSchedule(index: number) {
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function collapseToOne() {
    setSchedules((prev) => [prev[0]]);
  }

  function toggleAllDays(scheduleIndex: number) {
    setSchedules((prev) => {
      const allSelected = prev[scheduleIndex].days.size === WEEKDAYS.length;
      return prev.map((s, i) => {
        if (i === scheduleIndex) {
          return {
            ...s,
            days: allSelected ? new Set() : new Set(WEEKDAYS),
            daysError: false,
          };
        }
        if (!allSelected) {
          return { ...s, days: new Set() };
        }
        return s;
      });
    });
  }

  function toggleDay(scheduleIndex: number, day: DayOfWeek) {
    setSchedules((prev) =>
      prev.map((s, i) => {
        if (i === scheduleIndex) {
          const next = new Set(s.days);
          if (next.has(day)) next.delete(day);
          else next.add(day);
          return { ...s, days: next, daysError: false };
        }
        // Enforce day exclusivity across dosing schedules
        const next = new Set(s.days);
        next.delete(day);
        return { ...s, days: next };
      }),
    );
  }

  function addDoseTime(scheduleIndex: number) {
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: [...s.times, { time: "09:00", quantity: "1" }],
              timesError: false,
            }
          : s,
      ),
    );
  }

  function updateDoseTime(
    scheduleIndex: number,
    timeIndex: number,
    value: string,
  ) {
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: s.times.map((slot, j) =>
                j === timeIndex ? { ...slot, time: value } : slot,
              ),
              timesError: false,
            }
          : s,
      ),
    );
  }

  function updateSlotQuantity(
    scheduleIndex: number,
    timeIndex: number,
    value: string,
  ) {
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: s.times.map((slot, j) =>
                j === timeIndex ? { ...slot, quantity: value } : slot,
              ),
            }
          : s,
      ),
    );
  }

  function removeDoseTime(scheduleIndex: number, timeIndex: number) {
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: s.times.filter((_, j) => j !== timeIndex),
              timesError: false,
            }
          : s,
      ),
    );
  }

  return {
    doseForm,
    setDoseForm,
    drugName,
    setDrugName,
    dosageQuantity,
    setDosageQuantity,
    dosageUnit,
    setDosageUnit,
    dosageFallback,
    setDosageFallback,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    instructions,
    setInstructions,
    schedules,
    submitting,
    setSubmitting,
    error,
    setError,
    detectedDuplicateUnit,
    setDetectedDuplicateUnit,
    buildDosage,
    buildSchedule,
    validateSchedule,
    addSchedule,
    removeSchedule,
    collapseToOne,
    toggleAllDays,
    toggleDay,
    addDoseTime,
    updateDoseTime,
    updateSlotQuantity,
    removeDoseTime,
  };
}
