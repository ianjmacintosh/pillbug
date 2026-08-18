// PROTOTYPE — throwaway variant, see .claude/skills/prototype/UI.md.
// "Menu list": both actions become equal-weight rows in a list, like a
// settings menu. No button styling at all — hierarchy comes from order
// and status text, not size.
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ChevronRight, ClipboardList } from "lucide-react";
import { formatDate } from "../../../utils/dates";
import "./HomeVariantC.css";

interface HomeVariantCProps {
  prescriptionCount: number | null;
  lastFilledAt: string | null;
}

export function HomeVariantC({
  prescriptionCount,
  lastFilledAt,
}: HomeVariantCProps) {
  const { t, i18n } = useTranslation();
  const zeroRx = prescriptionCount === 0;

  return (
    <main className="home-c">
      <h1 className="home-c__heading">{t("home.prototype.menuTitle")}</h1>
      {lastFilledAt && (
        <p className="home-c__status">
          {t("home.lastFilled", {
            date: formatDate(lastFilledAt.slice(0, 10), i18n.language),
          })}
        </p>
      )}

      <ul className="home-c__list">
        <li>
          {zeroRx ? (
            <Link to="/prescriptions/new" className="home-c__row">
              <ClipboardList size={20} aria-hidden="true" />
              <span>{t("home.addFirstPrescription")}</span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="home-c__chevron"
              />
            </Link>
          ) : (
            <Link
              to="/fill-session/$step"
              params={{ step: "step1" }}
              className="home-c__row"
            >
              <CalendarCheck size={20} aria-hidden="true" />
              <span>{t("home.startFillSession")}</span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="home-c__chevron"
              />
            </Link>
          )}
        </li>
        <li>
          <Link to="/prescriptions" className="home-c__row">
            <ClipboardList size={20} aria-hidden="true" />
            <span>{t("home.viewPrescriptions")}</span>
            <ChevronRight
              size={16}
              aria-hidden="true"
              className="home-c__chevron"
            />
          </Link>
        </li>
      </ul>
    </main>
  );
}
