import { useEffect, useState } from "react";
import "./Prescriptions.css";

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

interface Prescription {
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

function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"list" | "form">("list");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [doseCount, setDoseCount] = useState("1");
  const [doseForm, setDoseForm] = useState("tablet");
  const [drugName, setDrugName] = useState("");
  const [dosageQuantity, setDosageQuantity] = useState("");
  const [dosageUnit, setDosageUnit] = useState<DosageUnit | "">("mg");
  const [dosageFallback, setDosageFallback] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduledDays, setScheduledDays] = useState<Set<DayOfWeek>>(new Set());
  const [doseTimes, setDoseTimes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState(false);
  const [timesError, setTimesError] = useState(false);
  const [detectedDuplicateUnit, setDetectedDuplicateUnit] =
    useState<DosageUnit | null>(null);

  function clearFields() {
    setDoseCount("1");
    setDoseForm("tablet");
    setDrugName("");
    setDosageQuantity("");
    setDosageUnit("mg");
    setDosageFallback(null);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setInstructions("");
    setScheduledDays(new Set());
    setDoseTimes(["09:00"]);
    setError(null);
    setDaysError(false);
    setTimesError(false);
    setDetectedDuplicateUnit(null);
  }

  function loadEditFields(p: Prescription) {
    setDoseCount(String(p.doseCount ?? 1));
    setDoseForm(p.doseForm ?? "tablet");
    setDrugName(p.drugName);
    const parsed = parseDosage(p.dosage);
    if (parsed) {
      setDosageQuantity(parsed.quantity);
      setDosageUnit(parsed.unit);
      setDosageFallback(null);
    } else {
      setDosageQuantity("");
      setDosageUnit("");
      setDosageFallback(p.dosage);
    }
    setStartDate(p.startDate);
    setEndDate(p.endDate ?? "");
    setInstructions(p.instructions ?? "");
    const days = new Set<DayOfWeek>();
    const allTimes = new Set<string>();
    for (const [day, times] of Object.entries(p.schedule.days)) {
      if (times && times.length > 0) {
        days.add(day as DayOfWeek);
        times.forEach((t) => allTimes.add(t));
      }
    }
    setScheduledDays(days);
    setDoseTimes(Array.from(allTimes).sort());
    setError(null);
    setDaysError(false);
    setTimesError(false);
  }

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => {
        setPrescriptions(data);
        if (data.length > 0) {
          loadEditFields(data[0]);
          setSelectedId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  function handleClickAdd() {
    clearFields();
    setSelectedId(null);
    setMobilePanel("form");
  }

  function handleCancel() {
    clearFields();
    setSelectedId(null);
    setMobilePanel("list");
  }

  function handleSelectPrescription(p: Prescription) {
    loadEditFields(p);
    setSelectedId(p.id);
    setMobilePanel("form");
  }

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

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const nextDaysError = scheduledDays.size === 0;
    const nextTimesError =
      doseTimes.length === 0 || doseTimes.some((t) => t === "");
    setDaysError(nextDaysError);
    setTimesError(nextTimesError);
    if (nextDaysError || nextTimesError) return;

    setSubmitting(true);

    const res = await fetch("/api/v1/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseCount: parseFloat(doseCount) || 1,
        doseForm,
        drugName,
        dosage: buildDosage(),
        schedule: buildSchedule(),
        startDate,
        endDate: endDate || null,
        instructions: instructions || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as Prescription;
      setPrescriptions((prev) => [...prev, created]);
      loadEditFields(created);
      setSelectedId(created.id);
    } else {
      const data = (await res.json()) as { error: string };
      setError(data.error);
    }

    setSubmitting(false);
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    const nextDaysError = scheduledDays.size === 0;
    const nextTimesError =
      doseTimes.length === 0 || doseTimes.some((t) => t === "");
    setDaysError(nextDaysError);
    setTimesError(nextTimesError);
    if (nextDaysError || nextTimesError) return;

    setSubmitting(true);

    const res = await fetch(`/api/v1/prescriptions/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseCount: parseFloat(doseCount) || 1,
        doseForm,
        drugName,
        dosage: buildDosage(),
        schedule: buildSchedule(),
        startDate,
        endDate: endDate || null,
        instructions: instructions || null,
      }),
    });

    if (res.ok) {
      const updated = (await res.json()) as Prescription;
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === selectedId ? updated : p)),
      );
      handleCancel();
    } else {
      const data = (await res.json()) as { error: string };
      setError(data.error);
    }

    setSubmitting(false);
  }

  async function handleConfirmDelete() {
    if (!deletingId) return;
    const res = await fetch(`/api/v1/prescriptions/${deletingId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setPrescriptions((prev) => prev.filter((p) => p.id !== deletingId));
      if (selectedId === deletingId) {
        clearFields();
        setSelectedId(null);
      }
      setDeletingId(null);
    }
  }

  const deletingPrescription = prescriptions.find((p) => p.id === deletingId);

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

  const scheduleSection = (
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
        <button type="button" className="add-dose-time" onClick={addDoseTime}>
          + Add new dose time
        </button>
      </fieldset>
    </div>
  );

  const prescriptionFields = (idPrefix: string) => (
    <>
      <div className="date-fields">
        <div className="field">
          <label htmlFor={`${idPrefix}-startDate`}>Start date</label>
          <input
            id={`${idPrefix}-startDate`}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </div>

        <div className="field">
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

      <div className="drug-info-row">
        <div className="field dose-count-field">
          <label htmlFor={`${idPrefix}-doseCount`}>Count</label>
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
        </div>

        <div className="field drug-name-field">
          <label htmlFor={`${idPrefix}-drugName`}>Drug name</label>
          <input
            id={`${idPrefix}-drugName`}
            type="text"
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
            required
          />
        </div>

        <div className="field drug-dosage-field">
          <label htmlFor={`${idPrefix}-dosage`}>Strength</label>
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
        </div>
      </div>
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
                dosageQuantity.slice(0, -detectedDuplicateUnit.length).trim(),
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

      {scheduleSection}

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

  return (
    <main className={`prescriptions prescriptions--mobile-${mobilePanel}`}>
      <div className="prescriptions-layout">
        <div className="prescriptions-list-panel">
          <h1>Prescriptions ({prescriptions.length})</h1>

          {deletingId && deletingPrescription && (
            <div role="dialog" aria-modal="true">
              <p>
                This will permanently delete{" "}
                <strong>{deletingPrescription.drugName}</strong> and all
                associated Dose history. This action is permanent and cannot be
                undone.
              </p>
              <div className="form-actions">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="button-danger"
                >
                  Yes, delete
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(null)}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <ul className="prescription-list">
            {prescriptions.map((p) => (
              <li
                key={p.id}
                className={`prescription-item${selectedId === p.id ? " prescription-item--selected" : ""}`}
              >
                <button
                  type="button"
                  className="prescription-item__name"
                  onClick={() => handleSelectPrescription(p)}
                >
                  {p.drugName}
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingId(p.id)}
                  className="button-danger button-sm"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={handleClickAdd}
            className="button-primary"
          >
            Add Prescription
          </button>
        </div>

        <div className="prescriptions-form-panel">
          {selectedId ? (
            <section>
              <h2>Edit prescription</h2>
              <form onSubmit={handleSaveEdit}>
                {error && <p role="alert">{error}</p>}
                {prescriptionFields("edit")}
                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="button-primary"
                  >
                    {submitting ? "Saving…" : "Save prescription"}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section>
              <h2>Add prescription</h2>
              <form onSubmit={handleCreate}>
                {error && <p role="alert">{error}</p>}
                {prescriptionFields("create")}
                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="button-primary"
                  >
                    {submitting ? "Saving…" : "Save prescription"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

export default Prescriptions;
