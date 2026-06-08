import { useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
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
  const { location } = useRouterState();
  const navigate = useNavigate();

  const idMatch = location.pathname.match(/^\/prescriptions\/([^/]+)/);
  const potentialId = idMatch ? idMatch[1] : null;
  const selectedId = potentialId !== "new" ? potentialId : null;
  const atChildRoute = location.pathname !== "/prescriptions";
  const mobileClass = atChildRoute
    ? "prescriptions--mobile-form"
    : "prescriptions--mobile-list";

  const didAutoNavigate = useRef(false);

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (
      !didAutoNavigate.current &&
      location.pathname === "/prescriptions" &&
      prescriptions.length > 0
    ) {
      didAutoNavigate.current = true;
      void navigate({
        to: "/prescriptions/$id",
        params: { id: prescriptions[0].id },
        replace: true,
      });
    }
  }, [prescriptions, location.pathname, navigate]);

  return (
    <main className={`prescriptions prescriptions-layout ${mobileClass}`}>
      <PrescriptionList prescriptions={prescriptions} selectedId={selectedId} />
      <div className="prescriptions-form-panel">
        <Button
          type="button"
          className="prescriptions-back-btn"
          onClick={() => navigate({ to: "/prescriptions" })}
        >
          {t("prescriptions.back")}
        </Button>
        <Outlet />
      </div>
    </main>
  );
}

export default Prescriptions;
