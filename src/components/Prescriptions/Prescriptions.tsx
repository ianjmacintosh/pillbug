import { useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClipboardList } from "lucide-react";
import { Button } from "../Button/Button";
import { NewPrescriptionForm } from "../PrescriptionForm";
import { PrescriptionList } from "./PrescriptionList";
import "./Prescriptions.css";

import type { Schedule } from "../../../shared/schedule";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  schedule: Schedule;
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
  const addingNew = location.pathname === "/prescriptions/new";
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
      <PrescriptionList
        prescriptions={prescriptions}
        selectedId={selectedId}
        hideAddButton={addingNew}
      />
      <div className="prescriptions-form-panel">
        {loading && !atChildRoute ? (
          <p role="status">{t("prescriptions.loading")}</p>
        ) : !atChildRoute && prescriptions.length === 0 ? (
          <NewPrescriptionForm />
        ) : !atChildRoute && prescriptions.length > 0 ? (
          <div className="prescriptions-select-prompt">
            <ClipboardList aria-hidden="true" />
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
