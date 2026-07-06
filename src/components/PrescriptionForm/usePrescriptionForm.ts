import { useCallback, useRef, useState } from "react";
import type { DayOfWeek } from "../../utils/constants";
import { WEEKDAYS } from "../../utils/constants";
import type { DosageUnit } from "./PrescriptionForm.helpers";
import { parseDosage } from "./PrescriptionForm.helpers";
import type { PrescriptionFormData } from "./PrescriptionForm.types";
import type { Schedule } from "../../../shared/schedule";

export interface TimeSlot {
  time: string;
  quantity: string;
  quantityError: boolean;
}

export interface DosingSchedule {
  days: Set<DayOfWeek>;
  times: TimeSlot[];
  daysError: boolean;
  timesError: boolean;
}

export interface ScheduleEditor {
  schedules: DosingSchedule[];
  buildSchedule: () => Schedule;
  validateSchedule: () => boolean;
  addSchedule: () => void;
  removeSchedule: (index: number) => void;
  collapseToOne: () => void;
  toggleAllDays: (scheduleIndex: number) => void;
  toggleDay: (scheduleIndex: number, day: DayOfWeek) => void;
  addDoseTime: (scheduleIndex: number) => void;
  updateDoseTime: (
    scheduleIndex: number,
    timeIndex: number,
    value: string,
  ) => void;
  updateSlotQuantity: (
    scheduleIndex: number,
    timeIndex: number,
    value: string,
  ) => void;
  removeDoseTime: (scheduleIndex: number, timeIndex: number) => void;
}

export function initSchedules(
  prescription?: PrescriptionFormData,
): DosingSchedule[] {
  if (!prescription) {
    return [
      {
        days: new Set(),
        times: [{ time: "09:00", quantity: "1", quantityError: false }],
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
            quantityError: false,
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

function isValidQuantity(value: string): boolean {
  const parsed = parseFloat(value);
  return !Number.isNaN(parsed) && parsed > 0;
}

export function validateSchedules(
  schedules: DosingSchedule[],
): DosingSchedule[] {
  return schedules.map((s) => ({
    ...s,
    daysError: s.days.size === 0,
    timesError:
      s.times.length === 0 || s.times.some((slot) => slot.time === ""),
    times: s.times.map((slot) => ({
      ...slot,
      quantityError: !isValidQuantity(slot.quantity),
    })),
  }));
}

export function buildSchedule(schedules: DosingSchedule[]): Schedule {
  const days: Partial<Record<DayOfWeek, { time: string; quantity: number }[]>> =
    {};
  for (const schedule of schedules) {
    for (const day of schedule.days) {
      days[day] = schedule.times.map((slot) => ({
        time: slot.time,
        quantity: parseFloat(slot.quantity),
      }));
    }
  }
  return { days };
}

export function useScheduleEditor(
  prescription?: PrescriptionFormData,
  markDirty?: () => void,
): ScheduleEditor {
  const [schedules, setSchedules] = useState<DosingSchedule[]>(() =>
    initSchedules(prescription),
  );

  function validateSchedule(): boolean {
    const next = validateSchedules(schedules);
    setSchedules(next);
    return next.every(
      (s) =>
        !s.daysError &&
        !s.timesError &&
        !s.times.some((slot) => slot.quantityError),
    );
  }

  function addSchedule() {
    markDirty?.();
    setSchedules((prev) => [
      ...prev,
      {
        days: new Set(),
        times: [{ time: "09:00", quantity: "1", quantityError: false }],
        daysError: false,
        timesError: false,
      },
    ]);
  }

  function removeSchedule(index: number) {
    markDirty?.();
    setSchedules((prev) => prev.filter((_, i) => i !== index));
  }

  function collapseToOne() {
    markDirty?.();
    setSchedules((prev) => [prev[0]]);
  }

  function toggleAllDays(scheduleIndex: number) {
    markDirty?.();
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
    markDirty?.();
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
    markDirty?.();
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: [
                ...s.times,
                { time: "09:00", quantity: "1", quantityError: false },
              ],
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
    markDirty?.();
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
    markDirty?.();
    setSchedules((prev) =>
      prev.map((s, i) =>
        i === scheduleIndex
          ? {
              ...s,
              times: s.times.map((slot, j) =>
                j === timeIndex
                  ? { ...slot, quantity: value, quantityError: false }
                  : slot,
              ),
            }
          : s,
      ),
    );
  }

  function removeDoseTime(scheduleIndex: number, timeIndex: number) {
    markDirty?.();
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
    schedules,
    buildSchedule: () => buildSchedule(schedules),
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

export function usePrescriptionForm(prescription?: PrescriptionFormData) {
  const dirtyRef = useRef(false);
  const markDirty = useCallback(() => {
    dirtyRef.current = true;
  }, []);
  const clearDirty = useCallback(() => {
    dirtyRef.current = false;
  }, []);

  const scheduleEditor = useScheduleEditor(prescription, markDirty);

  const [doseForm, setDoseFormRaw] = useState(() =>
    prescription ? (prescription.doseForm ?? "tablet") : "tablet",
  );
  const [drugName, setDrugNameRaw] = useState(() =>
    prescription ? prescription.drugName : "",
  );
  const [dosageQuantity, setDosageQuantityRaw] = useState(() => {
    if (!prescription) return "";
    const parsed = parseDosage(prescription.dosage);
    return parsed ? parsed.quantity : "";
  });
  const [dosageUnit, setDosageUnitRaw] = useState<DosageUnit | "">(() => {
    if (!prescription) return "mg";
    const parsed = parseDosage(prescription.dosage);
    return parsed ? parsed.unit : "";
  });
  const [dosageFallback, setDosageFallbackRaw] = useState<string | null>(() => {
    if (!prescription) return null;
    return parseDosage(prescription.dosage) ? null : prescription.dosage;
  });
  const [startDate, setStartDateRaw] = useState(() =>
    prescription
      ? prescription.startDate
      : new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDateRaw] = useState(() =>
    prescription ? (prescription.endDate ?? "") : "",
  );
  const [instructions, setInstructionsRaw] = useState(() =>
    prescription ? (prescription.instructions ?? "") : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedDuplicateUnit, setDetectedDuplicateUnit] =
    useState<DosageUnit | null>(null);

  const setDoseForm: typeof setDoseFormRaw = (value) => {
    markDirty();
    setDoseFormRaw(value);
  };
  const setDrugName: typeof setDrugNameRaw = (value) => {
    markDirty();
    setDrugNameRaw(value);
  };
  const setDosageQuantity: typeof setDosageQuantityRaw = (value) => {
    markDirty();
    setDosageQuantityRaw(value);
  };
  const setDosageUnit: typeof setDosageUnitRaw = (value) => {
    markDirty();
    setDosageUnitRaw(value);
  };
  const setDosageFallback: typeof setDosageFallbackRaw = (value) => {
    markDirty();
    setDosageFallbackRaw(value);
  };
  const setStartDate: typeof setStartDateRaw = (value) => {
    markDirty();
    setStartDateRaw(value);
  };
  const setEndDate: typeof setEndDateRaw = (value) => {
    markDirty();
    setEndDateRaw(value);
  };
  const setInstructions: typeof setInstructionsRaw = (value) => {
    markDirty();
    setInstructionsRaw(value);
  };

  function buildDosage(): string {
    if (dosageFallback !== null) return dosageFallback;
    return dosageUnit === ""
      ? dosageQuantity
      : `${dosageQuantity} ${dosageUnit}`;
  }

  const missingFields: ("drugName" | "dosingDays")[] = [
    ...(!drugName.trim() ? (["drugName"] as const) : []),
    ...(!scheduleEditor.schedules.some((s) => s.days.size > 0)
      ? (["dosingDays"] as const)
      : []),
  ];

  return {
    dirtyRef,
    clearDirty,
    scheduleEditor,
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
    submitting,
    setSubmitting,
    error,
    setError,
    detectedDuplicateUnit,
    setDetectedDuplicateUnit,
    buildDosage,
    missingFields,
  };
}
