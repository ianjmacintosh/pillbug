import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarCheck, ClipboardList, Pencil } from "lucide-react";
import { Button } from "../Button/Button";
import { buildButtonClassName } from "../Button/Button.helpers";
import { buildScheduleSummary } from "../../utils/schedule";
import { formatDate } from "../../utils/dates";
import type { Schedule } from "../../../shared/schedule";
import "./Home.css";

interface Prescription {
  id: string;
  drugName: string;
  schedule: Schedule;
}

interface AccountData {
  lastFilledAt: string | null;
  timezone: string | null;
}

function Home() {
  const { t, i18n } = useTranslation();
  const [prescriptions, setPrescriptions] = useState<Prescription[] | null>(
    null,
  );
  const [account, setAccount] = useState<AccountData | null>(null);

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AccountData | null) => setAccount(data))
      .catch(() => {});
  }, []);

  const prescriptionCount = prescriptions?.length ?? null;
  const zeroRx = prescriptionCount === 0;

  return (
    <main className="home">
      <div className="home__intro-panel">
        <h1>{t("home.greeting")}</h1>
        {account?.lastFilledAt && (
          <p className="home__status">
            {t("home.lastFilled", {
              date: formatDate(
                account.lastFilledAt.slice(0, 10),
                i18n.language,
              ),
            })}
          </p>
        )}

        {zeroRx ? (
          <Button
            as="link"
            to="/prescriptions/new"
            variant="primary"
            iconPosition="leading"
          >
            <ClipboardList size={18} aria-hidden="true" />
            {t("home.addFirstPrescription")}
          </Button>
        ) : (
          <Link
            to="/fill-session/$step"
            params={{ step: "step1" }}
            className={buildButtonClassName({
              variant: "primary",
              iconPosition: "leading",
            })}
          >
            <CalendarCheck size={18} aria-hidden="true" />
            {t("home.startFillSession")}
          </Link>
        )}
      </div>

      {prescriptions !== null && (
        <div className="home__paper">
          <h2>{t("home.prescriptionsHeading")}</h2>

          {!zeroRx && (
            <ul className="home__rx-list">
              {prescriptions.map((p) => (
                <li key={p.id} className="home__rx-line">
                  <span className="home__rx-name">{p.drugName}</span>
                  <span className="home__rx-schedule">
                    {buildScheduleSummary(p.schedule, t, i18n.language)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Button
            as="link"
            to="/prescriptions"
            variant="secondary"
            iconPosition="leading"
            className="home__edit-button"
          >
            <Pencil size={18} aria-hidden="true" />
            {t("home.editPrescriptions")}
          </Button>
        </div>
      )}
    </main>
  );
}

export default Home;
