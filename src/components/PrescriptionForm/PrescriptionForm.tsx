import { useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { type TFunction } from "i18next";

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

export interface PrescriptionFormData {
  id: string;
  doseForm: string;
  drugName: string;
  dosage: string;
  schedule: {
    days: Partial<Record<DayOfWeek, { time: string; quantity: number }[]>>;
  };
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

interface TimeSlot {
  time: string;
  quantity: string;
}

interface DosingSchedule {
  days: Set<DayOfWeek>;
  times: TimeSlot[];
  daysError: boolean;
  timesError: boolean;
}

function initSchedules(prescription?: PrescriptionFormData): DosingSchedule[] {
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

function usePrescriptionForm(prescription?: PrescriptionFormData) {
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
    toggleAllDays,
    toggleDay,
    addDoseTime,
    updateDoseTime,
    updateSlotQuantity,
    removeDoseTime,
  };
}

interface FormFieldsProps {
  t: TFunction;
  idPrefix: string;
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
  schedules: DosingSchedule[];
  detectedDuplicateUnit: DosageUnit | null;
  setDetectedDuplicateUnit: (v: DosageUnit | null) => void;
  addSchedule: () => void;
  removeSchedule: (index: number) => void;
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

function FormFields({
  t,
  idPrefix,
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
  detectedDuplicateUnit,
  setDetectedDuplicateUnit,
  addSchedule,
  removeSchedule,
  toggleAllDays,
  toggleDay,
  addDoseTime,
  updateDoseTime,
  updateSlotQuantity,
  removeDoseTime,
}: FormFieldsProps) {
  return (
    <>
      <div className="drug-info-row">
        <div className="field drug-name-field">
          <label htmlFor={`${idPrefix}-drugName`}>
            {t("prescriptionForm.drugNameLabel")}
          </label>
          <input
            id={`${idPrefix}-drugName`}
            type="text"
            value={drugName}
            onChange={(e) => setDrugName(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label htmlFor={`${idPrefix}-dosage`}>
            {t("prescriptionForm.strengthLabel")}
          </label>
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
                aria-label={t("prescriptionForm.unitLabel")}
                value={dosageUnit}
                onChange={(e) => {
                  setDosageUnit(e.target.value as DosageUnit | "");
                  setDetectedDuplicateUnit(
                    detectUnitInQuantity(dosageQuantity),
                  );
                }}
              >
                <option value="">
                  {t("prescriptionForm.dosageUnitBlank")}
                </option>
                <option value="mg">mg</option>
                <option value="g">g</option>
                <option value="mcg">mcg</option>
              </select>
            </div>
          )}
          {detectedDuplicateUnit !== null && (
            <p className="field-hint dosage-unit-warning">
              {t("prescriptionForm.dosageUnitWarning", {
                value: dosageUnit
                  ? `${dosageQuantity} ${dosageUnit}`
                  : dosageQuantity,
              })}{" "}
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
        </div>

        <div className="field drug-form-field">
          <label htmlFor={`${idPrefix}-doseForm`}>
            {t("prescriptionForm.formLabel")}
          </label>
          <select
            id={`${idPrefix}-doseForm`}
            value={doseForm}
            onChange={(e) => setDoseForm(e.target.value)}
          >
            <option value="tablet">
              {t("prescriptionForm.doseForm.tablet")}
            </option>
            <option value="capsule">
              {t("prescriptionForm.doseForm.capsule")}
            </option>
            <option value="pill">{t("prescriptionForm.doseForm.pill")}</option>
            <option value="other">
              {t("prescriptionForm.doseForm.other")}
            </option>
          </select>
        </div>
      </div>

      <section className="prescription-detail-schedule">
        <h3>{t("prescriptionForm.schedule")}</h3>

        <div className="date-range-row">
          <div>
            <label htmlFor={`${idPrefix}-startDate`}>
              {t("prescriptionForm.startDate")}
            </label>
            <input
              id={`${idPrefix}-startDate`}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-endDate`}>
              {t("prescriptionForm.endDate")}
            </label>
            <input
              id={`${idPrefix}-endDate`}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <p className="field-hint">{t("prescriptionForm.endDateHint")}</p>
          </div>
        </div>

        <div className="routine-list">
          {schedules.map((schedule, scheduleIndex) => (
            <div key={scheduleIndex} className="routine-block">
              <div className="routine-block-header">
                <span className="routine-block-label">
                  {t("prescriptionForm.dosingSchedule", {
                    number: scheduleIndex + 1,
                  })}
                </span>
                <button
                  type="button"
                  className="routine-remove-btn button-secondary button-sm"
                  aria-label={t("prescriptionForm.removeDosingSchedule")}
                  disabled={schedules.length === 1}
                  onClick={() => removeSchedule(scheduleIndex)}
                >
                  {t("prescriptionForm.removeDosingSchedule")}
                </button>
              </div>

              <fieldset
                className="schedule-days"
                aria-invalid={
                  schedule.daysError || schedule.timesError ? true : undefined
                }
              >
                <legend>
                  {t("prescriptionForm.daysAndTimes")}
                  <button
                    type="button"
                    className="toggle-all-link"
                    onClick={() => toggleAllDays(scheduleIndex)}
                  >
                    {schedule.days.size === WEEKDAYS.length
                      ? t("prescriptionForm.unselectAll")
                      : t("prescriptionForm.selectAll")}
                  </button>
                </legend>
                {schedule.daysError && (
                  <p role="alert" className="schedule-error-message">
                    {t("prescriptionForm.daysError")}
                  </p>
                )}
                <div className="day-pills-row">
                  {WEEKDAYS.map((day) => (
                    <label key={day} className="day-pill">
                      <input
                        type="checkbox"
                        className="visually-hidden"
                        checked={schedule.days.has(day)}
                        onChange={() => toggleDay(scheduleIndex, day)}
                        aria-label={t(`days.full.${day}`)}
                      />
                      <span aria-hidden="true">{t(`days.abbr.${day}`)}</span>
                    </label>
                  ))}
                </div>
                {schedule.timesError && (
                  <p role="alert" className="schedule-error-message">
                    {t("prescriptionForm.timesError")}
                  </p>
                )}
                <table className="prescription-list">
                  <thead>
                    <tr>
                      <th scope="col" className="col-time">
                        {t("prescriptionForm.time")}
                      </th>
                      <th scope="col" className="col-dose">
                        {t("prescriptionForm.dose")}
                      </th>
                      <th scope="col" className="col-remove">
                        <span className="visually-hidden">
                          {t("prescriptionForm.removeLabel")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.times.map((slot, timeIndex) => (
                      <tr key={timeIndex}>
                        <td className="col-time">
                          <input
                            type="time"
                            aria-label={`Time ${timeIndex + 1}`}
                            value={slot.time}
                            onChange={(e) =>
                              updateDoseTime(
                                scheduleIndex,
                                timeIndex,
                                e.target.value,
                              )
                            }
                          />
                        </td>
                        <td className="col-dose">
                          <span className="dose-cell">
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label={`Quantity ${timeIndex + 1}`}
                              value={slot.quantity}
                              onChange={(e) =>
                                updateSlotQuantity(
                                  scheduleIndex,
                                  timeIndex,
                                  e.target.value,
                                )
                              }
                              className="dose-time-qty-input"
                            />
                            {doseForm}
                          </span>
                        </td>
                        <td className="col-remove">
                          <button
                            type="button"
                            className="remove-time"
                            aria-label={t("prescriptionForm.removeDoseTime")}
                            disabled={schedule.times.length === 1}
                            onClick={() =>
                              removeDoseTime(scheduleIndex, timeIndex)
                            }
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button
                  type="button"
                  className="add-dose-time"
                  onClick={() => addDoseTime(scheduleIndex)}
                >
                  {t("prescriptionForm.addDoseTime")}
                </button>
              </fieldset>
            </div>
          ))}

          <button
            type="button"
            className="button-secondary button-sm"
            onClick={addSchedule}
          >
            {t("prescriptionForm.addDosingSchedule")}
          </button>
        </div>
      </section>

      <div className="field">
        <label htmlFor={`${idPrefix}-instructions`}>
          {t("prescriptionForm.instructionsLabel")}
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
  const { t } = useTranslation();
  const form = usePrescriptionForm();
  const navigate = useNavigate();

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch("/api/v1/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      await navigate({
        to: "/prescriptions/$id",
        params: { id: created.id },
      });
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>{t("prescriptionForm.addHeading")}</h2>
      <form onSubmit={handleCreate}>
        {form.error && <p role="alert">{form.error}</p>}
        <FormFields t={t} idPrefix="create" {...form} />
        <div className="form-actions">
          <button
            type="submit"
            disabled={form.submitting}
            className="button-primary"
          >
            {form.submitting
              ? t("prescriptionForm.saving")
              : t("prescriptionForm.save")}
          </button>
        </div>
      </form>
    </section>
  );
}

const editRouteApi = getRouteApi("/layout/prescriptions/$id/edit");

export function EditPrescriptionForm() {
  const { t } = useTranslation();
  const prescription = editRouteApi.useLoaderData() as PrescriptionFormData;
  const { id } = editRouteApi.useParams();
  const form = usePrescriptionForm(prescription);
  const navigate = useNavigate();

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch(`/api/v1/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
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
      await navigate({ to: "/prescriptions/$id", params: { id } });
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  return (
    <section>
      <h2>{t("prescriptionForm.editHeading")}</h2>
      <form onSubmit={handleSaveEdit}>
        {form.error && <p role="alert">{form.error}</p>}
        <FormFields t={t} idPrefix="edit" {...form} />
        <div className="form-actions">
          <button
            type="submit"
            disabled={form.submitting}
            className="button-primary"
          >
            {form.submitting
              ? t("prescriptionForm.saving")
              : t("prescriptionForm.save")}
          </button>
        </div>
      </form>
    </section>
  );
}
