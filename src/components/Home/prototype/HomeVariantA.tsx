// PROTOTYPE — throwaway variant, see .claude/skills/prototype/UI.md.
// "Status hero": a well summarizing where the patient stands, one modestly
// sized primary CTA below it, and the secondary action demoted to a plain
// link instead of a second full-width button.
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ClipboardList, Pill } from "lucide-react";
import { Button } from "../../Button/Button";
import { formatDate } from "../../../utils/dates";
import "./HomeVariantA.css";

interface HomeVariantAProps {
  prescriptionCount: number | null;
  lastFilledAt: string | null;
}

export function HomeVariantA({
  prescriptionCount,
  lastFilledAt,
}: HomeVariantAProps) {
  const { t, i18n } = useTranslation();

  return (
    <main className="home-a">
      <div className="home-a__hero well">
        <span
          className="icon-pill"
          style={{ "--pill-angle": "-10deg" } as React.CSSProperties}
        >
          <Pill size={20} aria-hidden="true" />
        </span>
        <h1>{t("home.prototype.greeting")}</h1>
        <p className="home-a__status">
          {lastFilledAt
            ? t("home.lastFilled", {
                date: formatDate(lastFilledAt.slice(0, 10), i18n.language),
              })
            : t("home.prototype.readyToFill")}
        </p>
      </div>

      <div className="home-a__actions">
        {prescriptionCount === 0 ? (
          <Button
            as="link"
            to="/prescriptions/new"
            className="button-primary button-leading-icon"
          >
            <ClipboardList size={18} aria-hidden="true" />
            {t("home.addFirstPrescription")}
          </Button>
        ) : (
          <Link
            to="/fill-session/$step"
            params={{ step: "step1" }}
            className="button button-primary button-leading-icon"
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {t("home.startFillSession")}
          </Link>
        )}
        <Link to="/prescriptions" className="home-a__secondary-link">
          {t("home.viewPrescriptions")}
        </Link>
      </div>
    </main>
  );
}
