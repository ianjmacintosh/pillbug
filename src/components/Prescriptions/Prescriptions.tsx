import { useState } from "react";
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

interface Schedule {
  days: Partial<Record<DayOfWeek, string[]>>;
  timezoneMode: "local" | "fixed_utc";
}

interface Prescription {
  id: string;
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
  const [revealed, setRevealed] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scheduledDays, setScheduledDays] = useState<Set<DayOfWeek>>(new Set());
  const [doseTimes, setDoseTimes] = useState<string[]>([]);
  const [pendingDoseIndex, setPendingDoseIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [daysError, setDaysError] = useState(false);
  const [timesError, setTimesError] = useState(false);

  async function handleReveal() {
    const res = await fetch("/api/v1/prescriptions");
    if (res.ok) {
      const data = (await res.json()) as Prescription[];
      setPrescriptions(data);
      setRevealed(true);
    }
  }

  function handleHide() {
    setPrescriptions([]);
    setRevealed(false);
  }

  function clearFields() {
    setDrugName("");
    setDosage("");
    setStartDate("");
    setEndDate("");
    setInstructions("");
    setScheduledDays(new Set());
    setDoseTimes([]);
    setError(null);
    setDaysError(false);
    setTimesError(false);
  }

  function handleOpenForm() {
    clearFields();
    setEditingId(null);
    setFormOpen(true);
  }

  function handleCancel() {
    clearFields();
    setFormOpen(false);
    setEditingId(null);
  }

  function handleEdit(p: Prescription) {
    setDrugName(p.drugName);
    setDosage(p.dosage);
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
    setFormOpen(false);
    setEditingId(p.id);
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
        drugName,
        dosage,
        schedule: buildSchedule(),
        startDate,
        endDate: endDate || null,
        instructions: instructions || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as Prescription;
      if (revealed) {
        setPrescriptions((prev) => [created, ...prev]);
      }
      handleCancel();
    } else {
      const data = (await res.json()) as { error: string };
      setError(data.error);
    }

    setSubmitting(false);
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingId) return;
    setError(null);
    const nextDaysError = scheduledDays.size === 0;
    const nextTimesError =
      doseTimes.length === 0 || doseTimes.some((t) => t === "");
    setDaysError(nextDaysError);
    setTimesError(nextTimesError);
    if (nextDaysError || nextTimesError) return;

    setSubmitting(true);

    const res = await fetch(`/api/v1/prescriptions/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drugName,
        dosage,
        schedule: buildSchedule(),
        startDate,
        endDate: endDate || null,
        instructions: instructions || null,
      }),
    });

    if (res.ok) {
      const updated = (await res.json()) as Prescription;
      setPrescriptions((prev) =>
        prev.map((p) => (p.id === editingId ? updated : p)),
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
    setPendingDoseIndex(doseTimes.length);
    setDoseTimes((prev) => [...prev, ""]);
    setTimesError(false);
  }

  function confirmDoseTime() {
    setPendingDoseIndex(null);
  }

  function updateDoseTime(index: number, value: string) {
    setDoseTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
    setTimesError(false);
  }

  function removeDoseTime(index: number) {
    setDoseTimes((prev) => prev.filter((_, i) => i !== index));
    if (pendingDoseIndex === index) setPendingDoseIndex(null);
    else if (pendingDoseIndex !== null && index < pendingDoseIndex)
      setPendingDoseIndex(pendingDoseIndex - 1);
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
              onClick={() => removeDoseTime(i)}
            >
              ×
            </button>
            {pendingDoseIndex === i && (
              <button
                type="button"
                className="confirm-time"
                aria-label="Confirm"
                disabled={!time}
                onClick={confirmDoseTime}
              >
                ✓
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          disabled={pendingDoseIndex !== null}
          onClick={addDoseTime}
        >
          New dose time
        </button>
      </fieldset>
    </div>
  );

  const prescriptionFields = (idPrefix: string) => (
    <>
      <div className="field">
        <label htmlFor={`${idPrefix}-drugName`}>Drug name</label>
        <input
          id={`${idPrefix}-drugName`}
          type="text"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor={`${idPrefix}-dosage`}>Dosage</label>
        <input
          id={`${idPrefix}-dosage`}
          type="text"
          value={dosage}
          onChange={(e) => setDosage(e.target.value)}
          required
        />
      </div>

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
        </div>
      </div>

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

      {scheduleSection}
    </>
  );

  return (
    <main className="prescriptions">
      <h1>Prescriptions</h1>

      <section>
        <h2>Your prescriptions</h2>
        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="button-secondary"
          >
            Show all prescriptions
          </button>
        ) : prescriptions.length === 0 ? (
          <>
            <p>No active prescriptions.</p>
            <button
              type="button"
              onClick={handleHide}
              className="button-secondary"
            >
              Hide
            </button>
          </>
        ) : (
          <>
            {deletingId && deletingPrescription && (
              <div role="dialog" aria-modal="true">
                <p>
                  This will permanently delete{" "}
                  <strong>{deletingPrescription.drugName}</strong> and all
                  associated Dose history. This action is permanent and cannot
                  be undone.
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
            <table className="prescription-list">
              <thead>
                <tr>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Drug Name</th>
                  <th>Dosage</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.startDate}</td>
                    <td>{p.endDate ?? "—"}</td>
                    <td>{p.drugName}</td>
                    <td>{p.dosage}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => handleEdit(p)}
                        className="button-secondary button-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(p.id)}
                        className="button-danger button-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={handleHide}
              className="button-secondary"
            >
              Hide
            </button>
          </>
        )}
      </section>

      {editingId && (
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
      )}

      {!editingId && (
        <section>
          {!formOpen ? (
            <button
              type="button"
              onClick={handleOpenForm}
              className="button-primary"
            >
              Add prescription
            </button>
          ) : (
            <>
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
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="button-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      )}
    </main>
  );
}

export default Prescriptions;
