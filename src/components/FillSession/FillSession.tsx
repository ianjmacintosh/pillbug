import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, formatMonthDay } from "../../utils/dates";
import { nearestSunday, sessionDates } from "../../../shared/week-boundaries";
import {
  groupByMedicine,
  medicineCardKey,
  type Compartment,
  type Schedule,
} from "../../../shared/fill-session";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Printer,
} from "lucide-react";
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
  insufficientCardKeys: string[];
}

interface FillSessionProps {
  compartments: Compartment[];
  organizerType: string;
  onDone?: (snapshot: FillSessionSnapshot) => void;
  isActive?: boolean;
}

const Route = getRouteApi("/layout/fill-session");

function FillSession({
  compartments,
  organizerType,
  onDone,
  isActive = true,
}: FillSessionProps) {
  const { t, i18n } = useTranslation();
  const { timezone } = Route.useLoaderData();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? "UTC",
  }).format(new Date());
  const [startDate, setStartDate] = useState(() => nearestSunday(today));
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [insufficientCardKeys, setInsufficientCardKeys] = useState<Set<string>>(
    new Set(),
  );

  const sessionDatesMap = sessionDates(startDate);
  const endDate = addDays(startDate, 6);
  const hasWrap = Object.values(sessionDatesMap).some((d) => d.wrapped);
  const startDateFmt = formatMonthDay(startDate, i18n.language);
  const endDateFmt = formatMonthDay(endDate, i18n.language);

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => {
        setPrescriptions(data);
        setCurrentIndex(0);
      })
      .catch(() => {});
  }, [compartments]);

  const cards = groupByMedicine(prescriptions, compartments);

  const goToPrevMedicine = () => setCurrentIndex((i) => Math.max(0, i - 1));
  const goToNextMedicine = () =>
    setCurrentIndex((i) => Math.min(cards.length - 1, i + 1));

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

  const toggleInsufficient = (cardKey: string) => {
    setInsufficientCardKeys((prev) => {
      const next = new Set(prev);
      if (next.has(cardKey)) {
        next.delete(cardKey);
      } else {
        next.add(cardKey);
      }
      return next;
    });
  };

  const handleDone = () => {
    onDone?.({
      cards,
      compartments,
      columnDates: sessionDatesMap,
      startDateFmt,
      endDateFmt,
      insufficientCardKeys: Array.from(insufficientCardKeys),
    });
  };

  if (!isActive) {
    return null;
  }

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

      {prescriptions.length === 0 ? (
        <p>{t("fillSession.noPrescriptions")}</p>
      ) : (
        <>
          <div className="fill-session-cards">
            {cards.map((card, index) => {
              const cardKey = medicineCardKey(card);
              return (
                <MedicineCard
                  key={cardKey}
                  card={card}
                  compartments={compartments}
                  columnDates={sessionDatesMap}
                  isCurrent={index === currentIndex}
                  isInsufficient={insufficientCardKeys.has(cardKey)}
                  onToggleInsufficient={() => toggleInsufficient(cardKey)}
                />
              );
            })}
          </div>
          <div className="fill-session-medicine-nav screen-only">
            <Button
              type="button"
              className="button-secondary button-leading-icon"
              onClick={goToPrevMedicine}
              disabled={currentIndex === 0}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              {t("fillSession.prevMedicine")}
            </Button>
            <span className="fill-session-medicine-nav-counter">
              {t("fillSession.medicineIndicator", {
                current: currentIndex + 1,
                total: cards.length,
              })}
            </span>
            {currentIndex === cards.length - 1 ? (
              <Button
                type="button"
                onClick={handleDone}
                className="button-primary button-leading-icon"
              >
                <Check size={18} aria-hidden="true" />
                {t("fillSession.doneButton")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goToNextMedicine}
                className="button-primary button-trailing-icon"
              >
                {t("fillSession.nextMedicine")}
                <ChevronRight size={18} aria-hidden="true" />
              </Button>
            )}
          </div>
        </>
      )}
      <div className="fill-session-actions screen-only">
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
