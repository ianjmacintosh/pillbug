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

function initScheduledDays(
  prescription?: PrescriptionFormData,
): Set<DayOfWeek> {
  if (!prescription) return new Set();
  const days = new Set<DayOfWeek>();
  for (const [day, times] of Object.entries(prescription.schedule.days)) {
    if (times && times.length > 0) days.add(day as DayOfWeek);
  }
  return days;
}

function initDoseTimes(prescription?: PrescriptionFormData): string[] {
  if (!prescription) return ["09:00"];
  const allTimes = new Set<string>();
  for (const times of Object.values(prescription.schedule.days)) {
    if (times) times.forEach((t) => allTimes.add(t));
  }
  return Array.from(allTimes).sort();
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
  const [scheduledDays, setScheduledDays] = useState<Set<DayOfWeek>>(() =>
    initScheduledDays(prescription),
  );
  const [doseTimes, setDoseTimes] = useState<string[]>(() =>
    initDoseTimes(prescription),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState(false);
  const [timesError, setTimesError] = useState(false);
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
    for (const day of WEEKDAYS) {
      if (scheduledDays.has(day)) days[day] = [...doseTimes];
    }
    return { days, timezoneMode: "local" };
  }

  function validateSchedule(): boolean {
    const nextDaysError = scheduledDays.size === 0;
    const nextTimesError =
      doseTimes.length === 0 || doseTimes.some((t) => t === "");
    setDaysError(nextDaysError);
    setTimesError(nextTimesError);
    return !nextDaysError && !nextTimesError;
  }

  function toggleDay(day: DayOfWeek) {
    const next = new Set(scheduledDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    setScheduledDays(next);
    setDaysError(false);
  }

  function toggleAllDays() {
    if (scheduledDays.size === WEEKDAYS.length) setScheduledDays(new Set());
    else setScheduledDays(new Set(WEEKDAYS));
    setDaysError(false);
  }

  function addDoseTime() {
    setDoseTimes((prev) => [...prev, "09:00"]);
    setTimesError(false);
  }

  function updateDoseTime(index: number, value: string) {
    setDoseTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
    setTimesError(false);
  }

  function removeDoseTime(index: number) {
    setDoseTimes((prev) => prev.filter((_, i) => i !== index));
    setTimesError(false);
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
    scheduledDays,
    doseTimes,
    submitting,
    setSubmitting,
    error,
    setError,
    daysError,
    timesError,
    detectedDuplicateUnit,
    setDetectedDuplicateUnit,
    buildDosage,
    buildSchedule,
    validateSchedule,
    toggleDay,
    toggleAllDays,
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
  scheduledDays: Set<DayOfWeek>;
  doseTimes: string[];
  daysError: boolean;
  timesError: boolean;
  detectedDuplicateUnit: DosageUnit | null;
  setDetectedDuplicateUnit: (v: DosageUnit | null) => void;
  toggleDay: (day: DayOfWeek) => void;
  toggleAllDays: () => void;
  addDoseTime: () => void;
  updateDoseTime: (index: number, value: string) => void;
  removeDoseTime: (index: number) => void;
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
  scheduledDays,
  doseTimes,
  daysError,
  timesError,
  detectedDuplicateUnit,
  setDetectedDuplicateUnit,
  toggleDay,
  toggleAllDays,
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

        <dt>
          <label htmlFor={`${idPrefix}-startDate`}>Start date</label>
        </dt>
        <dd>
          <input
            id={`${idPrefix}-startDate`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </dd>

        <dt>
          <label htmlFor={`${idPrefix}-endDate`}>End date (optional)</label>
        </dt>
        <dd>
          <input
            id={`${idPrefix}-endDate`}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <p className="field-hint">Leave blank for ongoing prescriptions.</p>
        </dd>
      </dl>

      <section className="prescription-detail-schedule">
        <h3>Schedule</h3>
        <div className="schedule-section">
          <fieldset
            className="schedule-days"
            aria-label="Days"
            aria-invalid={daysError ? true : undefined}
          >
            <legend>
              Days
              <button
                type="button"
                className="toggle-all-link"
                onClick={toggleAllDays}
              >
                {scheduledDays.size === WEEKDAYS.length
                  ? "(Unselect all)"
                  : "(Select all)"}
              </button>
            </legend>
            {daysError && (
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
                    checked={scheduledDays.has(day)}
                    onChange={() => toggleDay(day)}
                    aria-label={DAY_LABELS[day]}
                  />
                  <span aria-hidden="true">{DAY_ABBRS[day]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset aria-invalid={timesError ? true : undefined}>
            <legend>Dose times</legend>
            {timesError && (
              <p role="alert" className="schedule-error-message">
                Please add at least one dose time.
              </p>
            )}
            {doseTimes.map((time, i) => (
              <div key={i} className="dose-time-entry">
                <label>
                  Time {i + 1}
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => updateDoseTime(i, e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="remove-time"
                  aria-label="Remove"
                  disabled={doseTimes.length === 1}
                  onClick={() => removeDoseTime(i)}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="add-dose-time"
              onClick={addDoseTime}
            >
              + Add new dose time
            </button>
          </fieldset>
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
