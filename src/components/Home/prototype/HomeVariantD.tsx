// PROTOTYPE — throwaway variant, see .claude/skills/prototype/UI.md.
// "Greeting + focused CTA": A/C hybrid per user feedback. Time-of-day
// greeting + status line (A, minus the well background and pill icon),
// then the standard primary Button (no bespoke row/card styling) for the
// single next action. View Prescriptions only appears for first-time
// patients with zero prescriptions recorded, as a standard secondary Button.
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { Button } from "../../Button/Button";
import { formatDate } from "../../../utils/dates";
import "./HomeVariantD.css";

interface HomeVariantDProps {
  prescriptionCount: number | null;
  lastFilledAt: string | null;
  timezone: string | null;
}

function getLocalHour(timezone: string | null): number {
  try {
    const formatted = new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: timezone ?? undefined,
    }).format(new Date());
    return parseInt(formatted, 10);
  } catch {
    return new Date().getHours();
  }
}

function greetingKey(hour: number): string {
  if (hour < 12) return "home.prototype.greetingMorning";
  if (hour < 18) return "home.prototype.greetingAfternoon";
  return "home.prototype.greetingEvening";
}

export function HomeVariantD({
  prescriptionCount,
  lastFilledAt,
  timezone,
}: HomeVariantDProps) {
  const { t, i18n } = useTranslation();
  const zeroRx = prescriptionCount === 0;
  const hour = getLocalHour(timezone);

  return (
    <main className="home-d">
      <h1>{t(greetingKey(hour))}</h1>
      <p className="home-d__intro">
        {lastFilledAt
          ? t("home.lastFilled", {
              date: formatDate(lastFilledAt.slice(0, 10), i18n.language),
            })
          : t("home.prototype.readyToFill")}
      </p>

      <div className="home-d__actions">
        {zeroRx ? (
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
        {zeroRx && (
          <Button as="link" to="/prescriptions" className="button-secondary">
            {t("home.viewPrescriptions")}
          </Button>
        )}
      </div>
    </main>
  );
}
