import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { formatDate } from "../../utils/dates";
import {
  PrototypeSwitcher,
  type PrototypeVariant,
} from "../PrototypeSwitcher/PrototypeSwitcher";
import { HomeVariantA } from "./prototype/HomeVariantA";
import { HomeVariantB } from "./prototype/HomeVariantB";
import { HomeVariantC } from "./prototype/HomeVariantC";
import { HomeVariantD } from "./prototype/HomeVariantD";
import "./Home.css";

interface AccountData {
  lastFilledAt: string | null;
  timezone: string | null;
}

// PROTOTYPE — see .claude/skills/prototype/UI.md. "current" is the shipped
// design (kept byte-for-byte so existing tests/behavior don't move); a/b/c/d
// are throwaway variants under review. Once a winner is picked, fold it in
// here and delete this list, the imports above, and src/components/Home/prototype/.
const PROTOTYPE_VARIANTS: PrototypeVariant[] = [
  { key: "current", label: "Current — shipped" },
  { key: "a", label: "A — Status hero" },
  { key: "b", label: "B — Single focus" },
  { key: "c", label: "C — Menu list" },
  { key: "d", label: "D — Greeting + focused menu" },
];

function Home() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { variant } = useSearch({ strict: false }) as { variant?: string };
  const activeVariant = variant ?? "current";
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

  function setVariant(key: string) {
    void navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        variant: key === "current" ? undefined : key,
      }),
      replace: true,
    });
  }

  return (
    <>
      {activeVariant === "a" && (
        <HomeVariantA
          prescriptionCount={prescriptionCount}
          lastFilledAt={account?.lastFilledAt ?? null}
        />
      )}
      {activeVariant === "b" && (
        <HomeVariantB
          prescriptionCount={prescriptionCount}
          lastFilledAt={account?.lastFilledAt ?? null}
        />
      )}
      {activeVariant === "c" && (
        <HomeVariantC
          prescriptionCount={prescriptionCount}
          lastFilledAt={account?.lastFilledAt ?? null}
        />
      )}
      {activeVariant === "d" && (
        <HomeVariantD
          prescriptionCount={prescriptionCount}
          lastFilledAt={account?.lastFilledAt ?? null}
          timezone={account?.timezone ?? null}
        />
      )}
      {activeVariant === "current" && (
        <main className="home">
          {account?.lastFilledAt && (
            <p className="home-last-filled">
              {t("home.lastFilled", {
                date: formatDate(
                  account.lastFilledAt.slice(0, 10),
                  i18n.language,
                ),
              })}
            </p>
          )}
          {prescriptionCount === 0 ? (
            <Button
              as="link"
              to="/prescriptions/new"
              className="button-primary"
            >
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
      )}
      <PrototypeSwitcher
        variants={PROTOTYPE_VARIANTS}
        current={activeVariant}
        onChange={setVariant}
      />
    </>
  );
}

export default Home;
