import { useTranslation } from "react-i18next";
import { AlarmClockPlus, Trash2 } from "lucide-react";
import { Button } from "../Button/Button";
import type { DayOfWeek } from "../../utils/constants";
import { WEEKDAYS } from "../../utils/constants";
import type { DosingSchedule } from "./usePrescriptionForm";

interface RoutineBlockProps {
  doseForm: string;
  schedule: DosingSchedule;
  scheduleIndex: number;
  schedulesLength: number;
  hideHeader?: boolean;
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

export function RoutineBlock({
  doseForm,
  schedule,
  scheduleIndex,
  schedulesLength,
  hideHeader = false,
  removeSchedule,
  toggleAllDays,
  toggleDay,
  addDoseTime,
  updateDoseTime,
  updateSlotQuantity,
  removeDoseTime,
}: RoutineBlockProps) {
  const { t } = useTranslation();

  const fieldset = (
    <fieldset
      className="schedule-days"
      aria-invalid={
        schedule.daysError || schedule.timesError ? true : undefined
      }
    >
      <legend>
        {t("prescriptionForm.daysAndTimes")}
        <Button
          type="button"
          className="toggle-all-link"
          onClick={() => toggleAllDays(scheduleIndex)}
        >
          {schedule.days.size === WEEKDAYS.length
            ? t("prescriptionForm.unselectAll")
            : t("prescriptionForm.selectAll")}
        </Button>
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
                    updateDoseTime(scheduleIndex, timeIndex, e.target.value)
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
                <Button
                  type="button"
                  className="button-icon button-secondary-icon"
                  aria-label={t("prescriptionForm.removeDoseTime")}
                  disabled={schedule.times.length === 1}
                  onClick={() => removeDoseTime(scheduleIndex, timeIndex)}
                >
                  <Trash2 size={20} aria-hidden="true" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button
        type="button"
        className="button-secondary button-leading-icon add-dose-time"
        onClick={() => addDoseTime(scheduleIndex)}
      >
        <AlarmClockPlus size={18} aria-hidden="true" />
        {t("prescriptionForm.addDoseTime")}
      </Button>
    </fieldset>
  );

  if (hideHeader) return fieldset;

  return (
    <div className="routine-block">
      <div className="routine-block-header">
        <span className="routine-block-label">
          {t("prescriptionForm.dosingSchedule", { number: scheduleIndex + 1 })}
        </span>
        <Button
          type="button"
          className="routine-remove-btn button-secondary button-sm"
          aria-label={t("prescriptionForm.removeDosingSchedule")}
          disabled={schedulesLength === 1}
          onClick={() => removeSchedule(scheduleIndex)}
        >
          {t("prescriptionForm.removeDosingSchedule")}
        </Button>
      </div>
      {fieldset}
    </div>
  );
}
