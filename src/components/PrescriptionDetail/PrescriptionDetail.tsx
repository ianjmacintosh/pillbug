import { useState } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import "./PrescriptionDetail.css";
import { formatTimeOfDay, formatNumericDate } from "../../utils/dates";
import type { DayOfWeek } from "../../utils/constants";
import { WEEKDAYS } from "../../utils/constants";
import { Button } from "../Button/Button";
import { DeleteDialog } from "./DeleteDialog";

export interface PerSlotDose {
  time: string;
  quantity: number;
}

interface Schedule {
  days: Partial<Record<DayOfWeek, (PerSlotDose | string)[]>>;
}

export interface Prescription {
  id: string;
  doseForm: string;
  drugName: string;
  dosage: string;
  schedule: Schedule;
  startDate: string;
  endDate: string | null;
  prescribingDoctor: string | null;
  instructions: string | null;
  status: string;
}

interface Routine {
  days: DayOfWeek[];
  slots: PerSlotDose[];
}

function toPerSlotDose(slot: PerSlotDose | string): PerSlotDose {
  return typeof slot === "string" ? { time: slot, quantity: 1 } : slot;
}

function groupRoutines(
  days: Partial<Record<DayOfWeek, (PerSlotDose | string)[]>>,
): Routine[] {
  const bySignature = new Map<string, DayOfWeek[]>();
  for (const day of WEEKDAYS) {
    const slots = days[day];
    if (!slots) continue;
    const sig = JSON.stringify(slots);
    const group = bySignature.get(sig) ?? [];
    group.push(day);
    bySignature.set(sig, group);
  }
  return Array.from(bySignature.entries()).map(([sig, groupDays]) => ({
    days: groupDays,
    slots: (JSON.parse(sig) as Array<PerSlotDose | string>).map(toPerSlotDose),
  }));
}

const routeApi = getRouteApi("/layout/prescriptions/$id");

function PrescriptionDetail() {
  const { t, i18n } = useTranslation();
  const prescription = routeApi.useLoaderData() as Prescription;
  const { id } = routeApi.useParams();
  const routines = groupRoutines(prescription.schedule.days);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const navigate = useNavigate();

  async function handleConfirmDelete() {
    await fetch(`/api/v1/prescriptions/${id}`, { method: "DELETE" });
    await navigate({ to: "/prescriptions" });
  }

  return (
    <>
      <article>
        <div className="prescription-detail-header">
          <h2>{prescription.drugName}</h2>
          <div className="prescription-detail-actions">
            <Link to="/prescriptions/$id/edit" params={{ id }}>
              {t("prescriptionDetail.edit")}
            </Link>
            <span aria-hidden="true"> | </span>
            <Button type="button" onClick={() => setShowDeleteDialog(true)}>
              {t("prescriptionDetail.delete")}
            </Button>
          </div>
        </div>
        <dl className="prescription-detail-meta">
          <dt>{t("prescriptionDetail.strength")}</dt>
          <dd>{prescription.dosage}</dd>
          <dt>{t("prescriptionDetail.startDate")}</dt>
          <dd>
            <time dateTime={prescription.startDate}>
              {formatNumericDate(prescription.startDate)}
            </time>
          </dd>
          <dt>{t("prescriptionDetail.endDate")}</dt>
          <dd>
            {prescription.endDate ? (
              <time dateTime={prescription.endDate}>
                {formatNumericDate(prescription.endDate)}
              </time>
            ) : (
              t("prescriptionDetail.endDateNa")
            )}
          </dd>
        </dl>
        <section className="prescription-detail-schedule">
          <h3>{t("prescriptionDetail.schedule")}</h3>
          {routines.map((routine) => {
            const routineLabel =
              routine.days.length === 7
                ? t("prescriptionDetail.scheduleDaily")
                : routine.days.map((d) => t(`days.abbr.${d}`)).join(", ");
            return (
              <section
                key={routineLabel}
                className="prescription-detail-routine"
              >
                <h4>{routineLabel}</h4>
                <table className="prescription-list">
                  <thead>
                    <tr>
                      <th scope="col">{t("prescriptionDetail.time")}</th>
                      <th scope="col">{t("prescriptionDetail.dose")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routine.slots.map((slot) => (
                      <tr key={slot.time}>
                        <td>
                          <time dateTime={slot.time}>
                            {formatTimeOfDay(slot.time, i18n.language)}
                          </time>
                        </td>
                        <td>
                          {t(`doseForm.${prescription.doseForm}`, {
                            count: slot.quantity,
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </section>
      </article>
      {showDeleteDialog && (
        <DeleteDialog
          onCancel={() => setShowDeleteDialog(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  );
}

export default PrescriptionDetail;
