import { useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { NewPrescriptionForm } from "../PrescriptionForm";
import { PrescriptionList } from "./PrescriptionList";
import "./Prescriptions.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  schedule: { days: Record<string, unknown> };
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

function Prescriptions() {
  const { t } = useTranslation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const { location } = useRouterState();
  const navigate = useNavigate();

  const idMatch = location.pathname.match(/^\/prescriptions\/([^/]+)/);
  const potentialId = idMatch ? idMatch[1] : null;
  const selectedId = potentialId !== "new" ? potentialId : null;
  const atChildRoute = location.pathname !== "/prescriptions";
  const showFormPanel =
    atChildRoute || (!loading && prescriptions.length === 0);
  const mobileClass = showFormPanel
    ? "prescriptions--mobile-form"
    : "prescriptions--mobile-list";

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [location.pathname]);

  return (
    <main className={`prescriptions prescriptions-layout ${mobileClass}`}>
      <PrescriptionList prescriptions={prescriptions} selectedId={selectedId} />
      <div className="prescriptions-form-panel">
        {loading && !atChildRoute ? (
          <p role="status">{t("prescriptions.loading")}</p>
        ) : !atChildRoute && prescriptions.length === 0 ? (
          <NewPrescriptionForm />
        ) : !atChildRoute && prescriptions.length > 0 ? (
          <div className="prescriptions-select-prompt">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
              <line x1="9" y1="12" x2="15" y2="12" />
              <line x1="9" y1="16" x2="11" y2="16" />
            </svg>
            <p>{t("prescriptions.selectPrompt")}</p>
          </div>
        ) : (
          <>
            <Button
              type="button"
              className="prescriptions-back-btn"
              onClick={() => navigate({ to: "/prescriptions" })}
            >
              {t("prescriptions.back")}
            </Button>
            <Outlet />
          </>
        )}
      </div>
    </main>
  );
}

export default Prescriptions;
