import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { formatDate } from "../../utils/dates";
import "./Home.css";

interface AccountData {
  lastFilledAt: string | null;
}

function Home() {
  const { t, i18n } = useTranslation();
  const [prescriptionCount, setPrescriptionCount] = useState<number | null>(
    null,
  );
  const [account, setAccount] = useState<AccountData | null>(null);

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown[]) => setPrescriptionCount(data.length))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/v1/account")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: AccountData | null) => setAccount(data))
      .catch(() => {});
  }, []);

  return (
    <main className="home">
      {account?.lastFilledAt && (
        <p className="home-last-filled">
          {t("home.lastFilled", {
            date: formatDate(account.lastFilledAt.slice(0, 10), i18n.language),
          })}
        </p>
      )}
      {prescriptionCount === 0 ? (
        <Button as="link" to="/prescriptions/new" className="button-primary">
          {t("home.addFirstPrescription")}
        </Button>
      ) : (
        <Link
          to="/fill-session/$step"
          params={{ step: "step1" }}
          className="button button-primary"
        >
          {t("home.startFillSession")}
        </Link>
      )}
      <Button as="link" to="/prescriptions" className="button-secondary">
        {t("home.viewPrescriptions")}
      </Button>
    </main>
  );
}

export default Home;
