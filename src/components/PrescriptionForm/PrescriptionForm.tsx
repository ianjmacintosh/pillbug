import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import "../Prescriptions/Prescriptions.css";
import "../PrescriptionDetail/PrescriptionDetail.css";

type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

const WEEKDAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_LABELS: Record<DayOfWeek, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

const DAY_ABBRS: Record<DayOfWeek, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

const DOSAGE_UNITS = ["mg", "g", "mcg"] as const;
type DosageUnit = (typeof DOSAGE_UNITS)[number];

function detectUnitInQuantity(quantity: string): DosageUnit | null {
  const sorted = ([...DOSAGE_UNITS] as string[]).sort(
    (a, b) => b.length - a.length,
  );
  const found = sorted.find((u) => quantity.toLowerCase().endsWith(u));
  return (found as DosageUnit) ?? null;
}

function parseDosage(
  raw: string,
): { quantity: string; unit: DosageUnit } | null {
  const i = raw.lastIndexOf(" ");
  if (i === -1) return null;
  const unit = raw.slice(i + 1);
  if (!(DOSAGE_UNITS as readonly string[]).includes(unit)) return null;
  return { quantity: raw.slice(0, i), unit: unit as DosageUnit };
}

interface Schedule {
  days: Partial<Record<DayOfWeek, string[]>>;
  timezoneMode: "local" | "fixed_utc";
}

export interface PrescriptionFormData {
  id: string;
  doseCount: number;
  doseForm: string;
  drugName: string;
  dosage: string;
  schedule: Schedule;
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

interface Routine {
  days: Set<DayOfWeek>;
  times: string[];
  daysError: boolean;
  timesError: boolean;
}

function initRoutines(prescription?: PrescriptionFormData): Routine[] {
  if (!prescription) {
    return [
      {
        days: new Set(),
        times: ["09:00"],
        daysError: false,
        timesError: false,
      },
    ];
  }

  const bySignature = new Map<string, Routine>();
  for (const [day, times] of Object.entries(prescription.schedule.days)) {
    if (!times || times.length === 0) continue;
    const sig = JSON.stringify([...times].sort());
    if (!bySignature.has(sig)) {
      bySignature.set(sig, {
        days: new Set(),
        times: [...times].sort(),
        daysError: false,
        timesError: false,
      });
    }
    bySignature.get(sig)!.days.add(day as DayOfWeek);
  }

  const routines = Array.from(bySignature.values());
  return routines.length > 0
    ? routines
    : [{ days: new Set(), times: [], daysError: false, timesError: false }];
}

function usePrescriptionForm(prescription?: PrescriptionFormData) {
  const [doseCount, setDoseCount] = useState(() =>
    prescription ? String(prescription.doseCount ?? 1) : "1",
  );
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
  const [routines, setRoutines] = useState<Routine[]>(() =>
    initRoutines(prescription),
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

  function buildSchedule(): Schedule {
    const days: Partial<Record<DayOfWeek, string[]>> = {};
    for (const routine of routines) {
      for (const day of routine.days) {
        days[day] = [...routine.times];
      }
    }
    return { days, timezoneMode: "local" };
  }

  function validateSchedule(): boolean {
    const nextRoutines = routines.map((routine) => ({
      ...routine,
      daysError: routine.days.size === 0,
      timesError:
        routine.times.length === 0 || routine.times.some((t) => t === ""),
    }));
    setRoutines(nextRoutines);
    return nextRoutines.every((r) => !r.daysError && !r.timesError);
  }

  function addRoutine() {
    setRoutines((prev) => [
      ...prev,
      {
        days: new Set(),
        times: ["09:00"],
        daysError: false,
        timesError: false,
      },
    ]);
  }

  function removeRoutine(index: number) {
    setRoutines((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleDay(routineIndex: number, day: DayOfWeek) {
    setRoutines((prev) =>
      prev.map((routine, i) => {
        if (i === routineIndex) {
          const next = new Set(routine.days);
          if (next.has(day)) next.delete(day);
          else next.add(day);
          return { ...routine, days: next, daysError: false };
        }
        // Enforce day exclusivity across routines
        const next = new Set(routine.days);
        next.delete(day);
        return { ...routine, days: next };
      }),
    );
  }

  function addDoseTime(routineIndex: number) {
    setRoutines((prev) =>
      prev.map((routine, i) =>
        i === routineIndex
          ? {
              ...routine,
              times: [...routine.times, "09:00"],
              timesError: false,
            }
          : routine,
      ),
    );
  }

  function updateDoseTime(
    routineIndex: number,
    timeIndex: number,
    value: string,
  ) {
    setRoutines((prev) =>
      prev.map((routine, i) =>
        i === routineIndex
          ? {
              ...routine,
              times: routine.times.map((t, j) => (j === timeIndex ? value : t)),
              timesError: false,
            }
          : routine,
      ),
    );
  }

  function removeDoseTime(routineIndex: number, timeIndex: number) {
    setRoutines((prev) =>
      prev.map((routine, i) =>
        i === routineIndex
          ? {
              ...routine,
              times: routine.times.filter((_, j) => j !== timeIndex),
              timesError: false,
            }
          : routine,
      ),
    );
  }

  return {
    doseCount,
    setDoseCount,
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
    routines,
    submitting,
    setSubmitting,
    error,
    setError,
    detectedDuplicateUnit,
    setDetectedDuplicateUnit,
    buildDosage,
    buildSchedule,
    validateSchedule,
    addRoutine,
    removeRoutine,
    toggleDay,
    addDoseTime,
    updateDoseTime,
    removeDoseTime,
  };
}

interface FormFieldsProps {
  idPrefix: string;
  doseCount: string;
  setDoseCount: (v: string) => void;
  doseForm: string;
  setDoseForm: (v: string) => void;
  drugName: string;
  setDrugName: (v: string) => void;
  dosageQuantity: string;
  setDosageQuantity: (v: string) => void;
  dosageUnit: DosageUnit | "";
  setDosageUnit: (v: DosageUnit | "") => void;
  dosageFallback: string | null;
  setDosageFallback: (v: string | null) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  instructions: string;
  setInstructions: (v: string) => void;
  routines: Routine[];
  detectedDuplicateUnit: DosageUnit | null;
  setDetectedDuplicateUnit: (v: DosageUnit | null) => void;
  addRoutine: () => void;
  removeRoutine: (index: number) => void;
  toggleDay: (routineIndex: number, day: DayOfWeek) => void;
  addDoseTime: (routineIndex: number) => void;
  updateDoseTime: (
    routineIndex: number,
    timeIndex: number,
    value: string,
  ) => void;
  removeDoseTime: (routineIndex: number, timeIndex: number) => void;
}

function FormFields({
  idPrefix,
  doseCount,
  setDoseCount,
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
  routines,
  detectedDuplicateUnit,
  setDetectedDuplicateUnit,
  addRoutine,
  removeRoutine,
  toggleDay,
  addDoseTime,
  updateDoseTime,
  removeDoseTime,
}: FormFieldsProps) {
  return (
    <>
      <dl className="prescription-detail-meta">
        <dt>
          <label htmlFor={`${idPrefix}-drugName`}>Drug name</label>
        </dt>
        <dd>
          <input
            id={`${idPrefix}-drugName`}
            type="text"
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
            required
          />
        </dd>

        <dt>
          <label htmlFor={`${idPrefix}-dosage`}>Strength</label>
        </dt>
        <dd>
          {dosageFallback !== null ? (
            <input
              id={`${idPrefix}-dosage`}
              type="text"
              value={dosageFallback}
              onChange={(e) => setDosageFallback(e.target.value)}
              required
            />
          ) : (
            <div className="dosage-input-row">
              <input
                id={`${idPrefix}-dosage`}
                type="text"
                value={dosageQuantity}
                onChange={(e) => {
                  setDosageQuantity(e.target.value);
                  setDetectedDuplicateUnit(null);
                }}
                onBlur={() => {
                  setDetectedDuplicateUnit(
                    detectUnitInQuantity(dosageQuantity),
                  );
                }}
                required
              />
              <select
                aria-label="Unit"
                value={dosageUnit}
                onChange={(e) => {
                  setDosageUnit(e.target.value as DosageUnit | "");
                  setDetectedDuplicateUnit(
                    detectUnitInQuantity(dosageQuantity),
                  );
                }}
              >
                <option value="">(blank)</option>
                <option value="mg">mg</option>
                <option value="g">g</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
          )}
          {detectedDuplicateUnit !== null && (
            <p className="field-hint dosage-unit-warning">
              Looks like you included the unit in the strength number (&ldquo;
              {dosageUnit ? `${dosageQuantity} ${dosageUnit}` : dosageQuantity}
              &rdquo;) &mdash; Did you mean{" "}
              <button
                type="button"
                className="dosage-fix-link"
                onClick={() => {
                  setDosageQuantity(
                    dosageQuantity
                      .slice(0, -detectedDuplicateUnit.length)
                      .trim(),
                  );
                  setDosageUnit(detectedDuplicateUnit);
                  setDetectedDuplicateUnit(null);
                }}
              >
                {dosageQuantity.slice(0, -detectedDuplicateUnit.length).trim()}{" "}
                {detectedDuplicateUnit}
              </button>
              ?
            </p>
          )}
        </dd>

        <dt>
          <label htmlFor={`${idPrefix}-doseCount`}>Count</label>
        </dt>
        <dd>
          <div className="count-form-row">
            <input
              id={`${idPrefix}-doseCount`}
              type="text"
              value={doseCount}
              onChange={(e) => setDoseCount(e.target.value)}
              required
            />
            <select
              aria-label="Form"
              value={doseForm}
              onChange={(e) => setDoseForm(e.target.value)}
            >
              <option value="tablet">tablet</option>
              <option value="capsule">capsule</option>
              <option value="pill">pill</option>
              <option value="other">other</option>
            </select>
          </div>
        </dd>
      </dl>

      <section className="prescription-detail-schedule">
        <h3>Schedule</h3>

        <div className="date-range-row">
          <div>
            <label htmlFor={`${idPrefix}-startDate`}>Start date</label>
            <input
              id={`${idPrefix}-startDate`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-endDate`}>End date (optional)</label>
            <input
              id={`${idPrefix}-endDate`}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="field-hint">Leave blank for ongoing prescriptions.</p>
          </div>
        </div>

        <div className="routine-list">
          {routines.map((routine, routineIndex) => (
            <div key={routineIndex} className="routine-block">
              <div className="routine-block-header">
                <span className="routine-block-label">
                  Routine {routineIndex + 1}
                </span>
                <button
                  type="button"
                  className="routine-remove-btn button-secondary button-sm"
                  aria-label="Remove routine"
                  disabled={routines.length === 1}
                  onClick={() => removeRoutine(routineIndex)}
                >
                  Remove routine
                </button>
              </div>

              <fieldset
                className="schedule-days"
                aria-label="Days"
                aria-invalid={routine.daysError ? true : undefined}
              >
                <legend>Days</legend>
                {routine.daysError && (
                  <p role="alert" className="schedule-error-message">
                    Please select at least one day.
                  </p>
                )}
                <div className="day-pills-row">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="day-pill">
                      <input
                        type="checkbox"
                        className="visually-hidden"
                        checked={routine.days.has(day)}
                        onChange={() => toggleDay(routineIndex, day)}
                        aria-label={DAY_LABELS[day]}
                      />
                      <span aria-hidden="true">{DAY_ABBRS[day]}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset aria-invalid={routine.timesError ? true : undefined}>
                <legend>Dose times</legend>
                {routine.timesError && (
                  <p role="alert" className="schedule-error-message">
                    Please add at least one dose time.
                  </p>
                )}
                {routine.times.map((time, timeIndex) => (
                  <div key={timeIndex} className="dose-time-entry">
                    <label>
                      Time {timeIndex + 1}
                      <input
                        type="time"
                        value={time}
                        onChange={(e) =>
                          updateDoseTime(
                            routineIndex,
                            timeIndex,
                            e.target.value,
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="remove-time"
                      aria-label="Remove time"
                      disabled={routine.times.length === 1}
                      onClick={() => removeDoseTime(routineIndex, timeIndex)}
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="add-dose-time"
                  onClick={() => addDoseTime(routineIndex)}
                >
                  + Add new dose time
                </button>
              </fieldset>
            </div>
          ))}

          <button
            type="button"
            className="button-secondary button-sm"
            onClick={addRoutine}
          >
            + Add routine
          </button>
        </div>
      </section>

      <div className="field">
        <label htmlFor={`${idPrefix}-instructions`}>
          Instructions (optional)
        </label>
        <input
          id={`${idPrefix}-instructions`}
          type="text"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
    </>
  );
}

export function NewPrescriptionForm() {
  const form = usePrescriptionForm();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch("/api/v1/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseCount: parseFloat(form.doseCount) || 1,
        doseForm: form.doseForm,
        drugName: form.drugName,
        dosage: form.buildDosage(),
        schedule: form.buildSchedule(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        instructions: form.instructions || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as PrescriptionFormData;
      form.setSubmitting(false);
      // TODO: navigate to /prescriptions/${created.id} after API wiring (#156)
      void created;
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  return (
    <main className="prescriptions">
      <div className="prescriptions-form-panel">
        <section>
          <h2>Add prescription</h2>
          <form onSubmit={handleCreate}>
            {form.error && <p role="alert">{form.error}</p>}
            <FormFields idPrefix="create" {...form} />
            <div className="form-actions">
              <button
                type="submit"
                disabled={form.submitting}
                className="button-primary"
              >
                {form.submitting ? "Saving…" : "Save prescription"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

const editRouteApi = getRouteApi("/layout/prescriptions/$id/edit");

export function EditPrescriptionForm() {
  const prescription = editRouteApi.useLoaderData() as PrescriptionFormData;
  const { id } = editRouteApi.useParams();
  const form = usePrescriptionForm(prescription);

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch(`/api/v1/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseCount: parseFloat(form.doseCount) || 1,
        doseForm: form.doseForm,
        drugName: form.drugName,
        dosage: form.buildDosage(),
        schedule: form.buildSchedule(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        instructions: form.instructions || null,
      }),
    });

    if (res.ok) {
      // TODO: navigate back to /prescriptions/${id} after API wiring (#156)
      form.setSubmitting(false);
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  return (
    <main className="prescriptions">
      <div className="prescriptions-form-panel">
        <section>
          <h2>Edit prescription</h2>
          <form onSubmit={handleSaveEdit}>
            {form.error && <p role="alert">{form.error}</p>}
            <FormFields idPrefix="edit" {...form} />
            <div className="form-actions">
              <button
                type="submit"
                disabled={form.submitting}
                className="button-primary"
              >
                {form.submitting ? "Saving…" : "Save prescription"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
