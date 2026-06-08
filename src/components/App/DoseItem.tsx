import { Link } from "@tanstack/react-router";
import type { Dispatch, SetStateAction } from "react";
import { Checkbox } from "../Checkbox/Checkbox";

export interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  quantity: number;
  doseForm: string;
  scheduledAt: string;
  actionable: boolean;
  resolvedDose: { id: string; status: "taken" } | null;
}

interface DoseItemProps {
  dose: ScheduledDose;
  setDoses: Dispatch<SetStateAction<ScheduledDose[]>>;
}

export function DoseItem({ dose, setDoses }: DoseItemProps) {
  async function handleToggle() {
    if (dose.resolvedDose) {
      const res = await fetch(`/api/v1/doses/${dose.resolvedDose.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDoses((prev) =>
          prev.map((d) =>
            d.prescriptionId === dose.prescriptionId &&
            d.scheduledAt === dose.scheduledAt
              ? { ...d, resolvedDose: null }
              : d,
          ),
        );
      }
    } else {
      const res = await fetch("/api/v1/doses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prescriptionId: dose.prescriptionId,
          scheduledAt: dose.scheduledAt,
          status: "taken",
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as { id: string };
        setDoses((prev) =>
          prev.map((d) =>
            d.prescriptionId === dose.prescriptionId &&
            d.scheduledAt === dose.scheduledAt
              ? {
                  ...d,
                  resolvedDose: { id: created.id, status: "taken" as const },
                }
              : d,
          ),
        );
      }
    }
  }

  return (
    <li>
      <Checkbox
        checked={dose.resolvedDose !== null}
        disabled={!dose.actionable}
        onChange={handleToggle}
      >
        <span>
          {dose.quantity} {dose.doseForm} ×{" "}
          <Link to="/prescriptions/$id" params={{ id: dose.prescriptionId }}>
            {dose.drugName} {dose.dosage}
          </Link>
        </span>
      </Checkbox>
    </li>
  );
}
