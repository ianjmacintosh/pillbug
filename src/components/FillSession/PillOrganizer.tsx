import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { addDays, formatMonthDay } from "../../utils/dates";
import { sessionDates } from "../../../shared/week-boundaries";
import { Button } from "../Button/Button";
import { Select } from "../Select/Select";
import { PillOrganizerTable } from "./PillOrganizerTable";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import "./PillOrganizer.css";

interface PillOrganizerProps {
  value: string;
  onChange: (value: string) => void;
  startDate: string;
  onStartDateChange: Dispatch<SetStateAction<string>>;
  onContinue: () => void;
}

export function PillOrganizer({
  value,
  onChange,
  startDate,
  onStartDateChange,
  onContinue,
}: PillOrganizerProps) {
  const { t, i18n } = useTranslation();
  const endDate = addDays(startDate, 6);
  const startDateFmt = formatMonthDay(startDate, i18n.language);
  const endDateFmt = formatMonthDay(endDate, i18n.language);
  const compartments =
    ORGANIZER_OPTIONS.find((opt) => opt.value === value)?.compartments ?? [];
  const columnDates = sessionDates(startDate);

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.pillOrganizer.heading")}</h1>
      <p>{t("fillSessionWizard.pillOrganizer.description")}</p>
      <Select
        label={t("fillSession.pillOrganizerLabel")}
        className="pill-organizer-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ORGANIZER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </Select>
      <div className="pill-organizer-date-picker">
        <label
          htmlFor="pill-organizer-start-date"
          className="pill-organizer-date-picker-label"
        >
          {t("fillSession.startDateLabel")}
        </label>
        <div className="pill-organizer-date-picker-row">
          <Button
            type="button"
            className="button-icon button-secondary"
            aria-label={t("fillSession.prevWeek")}
            onClick={() => onStartDateChange((d) => addDays(d, -7))}
          >
            <ChevronLeft size={20} aria-hidden="true" />
          </Button>
          <input
            id="pill-organizer-start-date"
            type="date"
            value={startDate}
            onChange={(e) =>
              e.target.value && onStartDateChange(e.target.value)
            }
          />
          <Button
            type="button"
            className="button-icon button-secondary"
            aria-label={t("fillSession.nextWeek")}
            onClick={() => onStartDateChange((d) => addDays(d, 7))}
          >
            <ChevronRight size={20} aria-hidden="true" />
          </Button>
        </div>
        <p className="pill-organizer-date-picker-range">
          {startDateFmt}–{endDateFmt}
        </p>
      </div>
      <div className="pill-organizer-preview-frame">
        <PillOrganizerTable
          compartments={compartments}
          columnDates={columnDates}
          cellClassName={() => "pill-organizer-table-cell--empty"}
          renderCell={() => null}
        />
      </div>
      <Button
        type="button"
        onClick={onContinue}
        className="button-primary button-trailing-icon"
      >
        {t("fillSessionWizard.continueButton")}
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
