import { useEffect, useRef, useState } from "react";
import {
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import "./Prescriptions.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  schedule: { days: Record<string, unknown>; timezoneMode: string };
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

function Prescriptions() {
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
      .then((data: Prescription[]) => {
        setPrescriptions(data);
      })
      .catch(() => {});
  }, []);

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
      <div className="prescriptions-list-panel">
        <h1>Prescriptions ({prescriptions.length})</h1>

        <ul className="prescription-list">
          {prescriptions.map((p) => (
            <li
              key={p.id}
              className={`prescription-item${selectedId === p.id ? " prescription-item--selected" : ""}`}
            >
              <Link
                to="/prescriptions/$id"
                params={{ id: p.id }}
                className="prescription-item__name"
              >
                {p.drugName}
              </Link>
            </li>
          ))}
        </ul>

        <Link to="/prescriptions/new" className="button-secondary button-sm">
          + Add Prescription
        </Link>
      </div>
      <div className="prescriptions-form-panel">
        <button
          className="prescriptions-back-btn"
          onClick={() => navigate({ to: "/prescriptions" })}
        >
          ← Back
        </button>
        <Outlet />
      </div>
    </main>
  );
}

export default Prescriptions;
