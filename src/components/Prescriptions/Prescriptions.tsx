import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import "./Prescriptions.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  schedule: { days: Record<string, string[]>; timezoneMode: string };
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);

  useEffect(() => {
    fetch("/api/v1/prescriptions")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => {
        setPrescriptions(data);
      })
      .catch(() => {});
  }, []);

  return (
    <main className="prescriptions">
      <div className="prescriptions-list-panel">
        <h1>Prescriptions ({prescriptions.length})</h1>

        <ul className="prescription-list">
          {prescriptions.map((p) => (
            <li key={p.id} className="prescription-item">
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
    </main>
  );
}

export default Prescriptions;
