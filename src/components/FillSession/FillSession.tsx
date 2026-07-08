import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, formatMonthDay } from "../../utils/dates";
import { nearestSunday, sessionDates } from "../../../shared/week-boundaries";
import { Select } from "../Select/Select";
import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  groupByMedicine,
  type Compartment,
  type Schedule,
} from "../../../shared/fill-session";
import { ChevronLeft, ChevronRight, FileDown, Printer } from "lucide-react";
import { Button } from "../Button/Button";
import { MedicineCard } from "./MedicineCard";
import "./FillSession.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  doseForm: string;
  schedule: Schedule;
  status: string;
}

export interface FillSessionSnapshot {
  cards: ReturnType<typeof groupByMedicine>;
  compartments: Compartment[];
  columnDates: ReturnType<typeof sessionDates>;
  startDateFmt: string;
  endDateFmt: string;
}

interface FillSessionProps {
  onDone?: (snapshot: FillSessionSnapshot) => void;
}

const ORGANIZER_OPTIONS: {
  value: string;
  labelKey: string;
  compartments: Compartment[];
}[] = [
  {
    value: "1",
    labelKey: "fillSession.organizerOption.simple7day",
    compartments: ONE_COMPARTMENT,
  },
  {
    value: "2",
    labelKey: "fillSession.organizerOption.amPm",
    compartments: TWO_COMPARTMENTS,
  },
  {
    value: "3",
    labelKey: "fillSession.organizerOption.mornNoonNight",
    compartments: THREE_COMPARTMENTS,
  },
  {
    value: "4",
    labelKey: "fillSession.organizerOption.mornNoonEveNight",
    compartments: FOUR_COMPARTMENTS,
  },
];

const Route = getRouteApi("/layout/fill-session");

function FillSession({ onDone }: FillSessionProps) {
  const { t, i18n } = useTranslation();
  const { timezone } = Route.useLoaderData();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? "UTC",
  }).format(new Date());
  const [startDate, setStartDate] = useState(() => nearestSunday(today));
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [organizerType, setOrganizerType] = useState("1");
  const [openCardKey, setOpenCardKey] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const sessionDatesMap = sessionDates(startDate);
  const endDate = addDays(startDate, 6);
  const hasWrap = Object.values(sessionDatesMap).some((d) => d.wrapped);
  const startDateFmt = formatMonthDay(startDate, i18n.language);
  const endDateFmt = formatMonthDay(endDate, i18n.language);

  const compartments =
    ORGANIZER_OPTIONS.find((o) => o.value === organizerType)?.compartments ??
    ONE_COMPARTMENT;

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => {
        setPrescriptions(data);
        const initialCards = groupByMedicine(data, ONE_COMPARTMENT);
        if (initialCards.length > 0) {
          setOpenCardKey(
            `${initialCards[0].drugName}-${initialCards[0].dosage}`,
          );
        }
      })
      .catch(() => {});
  }, []);

  const cards = groupByMedicine(prescriptions, compartments);

  const toggleCard = (key: string) => {
    setOpenCardKey((prev) => (prev === key ? null : key));
  };

  const handleSavePdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(
        `/api/v1/fill-session/pdf?organizer=${organizerType}&startDate=${startDate}`,
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      a.href = url;
      a.download = match?.[1] ?? "Pillbug_Worksheet.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleDone = () => {
    onDone?.({
      cards,
      compartments,
      columnDates: sessionDatesMap,
      startDateFmt,
      endDateFmt,
    });
  };

  return (
    <div className="fill-session">
      <div className="fill-session-header">
        <h1>{t("fillSession.heading")}</h1>
        <h2 className="fill-session-date-range">
          {startDateFmt}–{endDateFmt}
        </h2>
        <div className="fill-session-date-picker screen-only">
          <label
            htmlFor="fill-session-start-date"
            className="fill-session-date-picker-label"
          >
            {t("fillSession.startDateLabel")}
          </label>
          <div className="fill-session-date-picker-row">
            <Button
              type="button"
              className="button-icon button-secondary"
              aria-label={t("fillSession.prevWeek")}
              onClick={() => setStartDate((d) => addDays(d, -7))}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </Button>
            <input
              id="fill-session-start-date"
              type="date"
              value={startDate}
              onChange={(e) => e.target.value && setStartDate(e.target.value)}
            />
            <Button
              type="button"
              className="button-icon button-secondary"
              aria-label={t("fillSession.nextWeek")}
              onClick={() => setStartDate((d) => addDays(d, 7))}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {hasWrap && (
        <p className="fill-session-wrap-warning">
          ⚠ {t("fillSession.wrapWarning")}
        </p>
      )}

      <div className="fill-session-controls screen-only">
        <Select
          label={t("fillSession.pillOrganizerLabel")}
          value={organizerType}
          onChange={(e) => setOrganizerType(e.target.value)}
        >
          {ORGANIZER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      {prescriptions.length === 0 ? (
        <p>{t("fillSession.noPrescriptions")}</p>
      ) : (
        <div className="fill-session-cards">
          {cards.map((card) => {
            const cardKey = `${card.drugName}-${card.dosage}`;
            return (
              <MedicineCard
                key={cardKey}
                card={card}
                compartments={compartments}
                columnDates={sessionDatesMap}
                isOpen={openCardKey === cardKey}
                onToggle={() => toggleCard(cardKey)}
              />
            );
          })}
        </div>
      )}
      <div className="fill-session-actions screen-only">
        {onDone && (
          <Button type="button" onClick={handleDone}>
            {t("fillSession.doneButton")}
          </Button>
        )}
        <Button
          type="button"
          className="button-secondary button-leading-icon"
          onClick={() => window.print()}
        >
          <Printer size={18} aria-hidden="true" />
          {t("fillSession.printButton")}
        </Button>
        <Button
          type="button"
          className="button-secondary button-leading-icon"
          onClick={handleSavePdf}
          disabled={pdfLoading}
        >
          <FileDown size={18} aria-hidden="true" />
          {t("fillSession.savePdfButton")}
        </Button>
      </div>
    </div>
  );
}

export default FillSession;
