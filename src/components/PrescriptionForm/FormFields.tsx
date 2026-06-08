import type { TFunction } from "i18next";
import type { DayOfWeek } from "../../lib/days";
import { WEEKDAYS } from "../../lib/days";
import type { DosageUnit } from "./PrescriptionForm.helpers";
import { detectUnitInQuantity } from "./PrescriptionForm.helpers";
import type { DosingSchedule } from "./usePrescriptionForm";

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

export function FormFields({
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
