// PROTOTYPE — throwaway variant, see .claude/skills/prototype/UI.md.
// "Single focused action": one large tappable card dominates the screen.
// There is no second button competing for attention — View Prescriptions
// is a small footer link, structurally an afterthought rather than a peer.
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ClipboardList } from "lucide-react";
import { formatDate } from "../../../utils/dates";
import "./HomeVariantB.css";

interface HomeVariantBProps {
  prescriptionCount: number | null;
  lastFilledAt: string | null;
}

export function HomeVariantB({
  prescriptionCount,
  lastFilledAt,
}: HomeVariantBProps) {
  const { t, i18n } = useTranslation();
  const zeroRx = prescriptionCount === 0;

  return (
    <main className="home-b">
      {lastFilledAt && (
        <p className="home-b__status">
          {t("home.lastFilled", {
            date: formatDate(lastFilledAt.slice(0, 10), i18n.language),
          })}
        </p>
      )}

      {zeroRx ? (
        <Link to="/prescriptions/new" className="home-b__card">
          <ClipboardList size={36} aria-hidden="true" />
          <span className="home-b__card-title">
            {t("home.addFirstPrescription")}
          </span>
        </Link>
      ) : (
        <Link
          to="/fill-session/$step"
          params={{ step: "step1" }}
          className="home-b__card"
        >
          <CalendarCheck size={36} aria-hidden="true" />
          <span className="home-b__card-title">
            {t("home.startFillSession")}
          </span>
          <span className="home-b__card-sub">
            {t("home.prototype.estimatedTime")}
          </span>
        </Link>
      )}

      <Link to="/prescriptions" className="home-b__footer-link">
        {t("home.viewPrescriptions")}
      </Link>
    </main>
  );
}
