import type { TFunction } from "i18next";
import { useState } from "react";
import type { DayOfWeek } from "../../utils/constants";
import { Button } from "../Button/Button";
import type { DosageUnit } from "./PrescriptionForm.helpers";
import { detectUnitInQuantity } from "./PrescriptionForm.helpers";
import { RoutineBlock } from "./RoutineBlock";
import type { DosingSchedule } from "./usePrescriptionForm";

interface PrescriptionFieldsProps {
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

export function PrescriptionFields({
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
  collapseToOne,
  toggleAllDays,
  toggleDay,
  addDoseTime,
  updateDoseTime,
  updateSlotQuantity,
  removeDoseTime,
}: PrescriptionFieldsProps) {
  const [isAdvanced, setIsAdvanced] = useState(() => schedules.length > 1);

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
              <Button
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
              </Button>
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
        <div className="schedule-heading">
          <h3>{t("prescriptionForm.schedule")}</h3>
          <span className="schedule-mode-toggle">
            <button
              type="button"
              className="schedule-mode-btn"
              aria-pressed={!isAdvanced}
              onClick={() => {
                if (
                  schedules.length > 1 &&
                  !window.confirm(t("prescriptionForm.collapseToSimpleConfirm"))
                ) {
                  return;
                }
                setIsAdvanced(false);
                collapseToOne();
              }}
            >
              {t("prescriptionForm.simpleScheduling")}
            </button>
            <button
              type="button"
              className="schedule-mode-btn"
              aria-pressed={isAdvanced}
              onClick={() => setIsAdvanced(true)}
            >
              {t("prescriptionForm.advancedScheduling")}
            </button>
          </span>
        </div>

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

        {isAdvanced && (
          <p className="advanced-scheduling-hint">
            {t("prescriptionForm.advancedSchedulingHint")}
          </p>
        )}
        <div className="routine-list">
          {schedules.map((schedule, scheduleIndex) => (
            <RoutineBlock
              key={scheduleIndex}
              doseForm={doseForm}
              schedule={schedule}
              scheduleIndex={scheduleIndex}
              schedulesLength={schedules.length}
              hideHeader={!isAdvanced}
              removeSchedule={removeSchedule}
              toggleAllDays={toggleAllDays}
              toggleDay={toggleDay}
              addDoseTime={addDoseTime}
              updateDoseTime={updateDoseTime}
              updateSlotQuantity={updateSlotQuantity}
              removeDoseTime={removeDoseTime}
            />
          ))}

          {isAdvanced && (
            <Button
              type="button"
              className="button-secondary button-sm"
              onClick={addSchedule}
            >
              {t("prescriptionForm.addDosingSchedule")}
            </Button>
          )}
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
