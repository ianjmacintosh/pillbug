import { Fragment, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { WEEKDAYS } from "../../utils/constants";
import { formatMonthDay } from "../../utils/dates";
import type { Compartment } from "../../../shared/fill-session";
import "./PillOrganizerTable.css";

interface CellArgs {
  compartment: Compartment;
  compIdx: number;
  day: string;
  dayIdx: number;
}

interface PillOrganizerTableProps {
  compartments: Compartment[];
  columnDates: Record<string, { date: string; wrapped: boolean }>;
  showWrapIndicator?: boolean;
  renderCell: (cell: CellArgs) => ReactNode;
  cellClassName?: (cell: CellArgs) => string | undefined;
}

export function PillOrganizerTable({
  compartments,
  columnDates,
  showWrapIndicator = false,
  renderCell,
  cellClassName,
}: PillOrganizerTableProps) {
  const { t, i18n } = useTranslation();

  return (
    <div
      className="pill-organizer-table"
      style={
        {
          "--day-count": WEEKDAYS.length,
          "--comp-count": compartments.length,
        } as React.CSSProperties
      }
    >
      <div className="pill-organizer-table-corner" />

      {WEEKDAYS.map((day, dayIdx) => {
        const { date, wrapped } = columnDates[day];
        const isWrapped = showWrapIndicator && wrapped;
        return (
          <div
            key={day}
            className={`pill-organizer-table-day-header${isWrapped ? " pill-organizer-table-day-header--wrapped" : ""}`}
            style={{ "--day-idx": dayIdx } as React.CSSProperties}
          >
            {isWrapped && (
              <span
                className="pill-organizer-table-wrap-icon"
                title={t("fillSession.wrapColumnTooltip")}
                aria-label={t("fillSession.wrapColumnTooltip")}
              >
                ⚠
              </span>
            )}
            <span>{t(`days.abbr.${day}`)}</span>
            <span className="pill-organizer-table-day-date">
              {formatMonthDay(date, i18n.language)}
            </span>
          </div>
        );
      })}

      {compartments.map((comp, compIdx) => (
        <Fragment key={comp.label}>
          <div
            className="pill-organizer-table-slot-label"
            style={{ "--comp-idx": compIdx } as React.CSSProperties}
          >
            <span className="pill-organizer-table-slot-name">{comp.label}</span>
            <span className="pill-organizer-table-slot-time">
              {comp.startTime}–{comp.endTime}
            </span>
          </div>
          {WEEKDAYS.map((day, dayIdx) => {
            const cell = { compartment: comp, compIdx, day, dayIdx };
            const extraClassName = cellClassName?.(cell);
            return (
              <div
                key={day}
                className={`pill-organizer-table-cell${extraClassName ? ` ${extraClassName}` : ""}`}
                style={
                  {
                    "--day-idx": dayIdx,
                    "--comp-idx": compIdx,
                  } as React.CSSProperties
                }
              >
                {renderCell(cell)}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
