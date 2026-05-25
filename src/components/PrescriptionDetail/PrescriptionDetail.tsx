import { useState } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import "./PrescriptionDetail.css";

type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface PerSlotDose {
  time: string;
  quantity: number;
}

interface Schedule {
  days: Partial<Record<DayOfWeek, (PerSlotDose | string)[]>>;
  timezoneMode: "local" | "fixed_utc";
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

const WEEKDAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const DAY_ABBRS: Record<DayOfWeek, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

interface Routine {
  label: string;
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
    label:
      groupDays.length === 7
        ? "Daily"
        : groupDays.map((d) => DAY_ABBRS[d]).join(", "),
    slots: (JSON.parse(sig) as Array<PerSlotDose | string>).map(toPerSlotDose),
  }));
}

function formatTime(time: string): string {
  const [hourStr, minute] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const period = hour < 12 ? "AM" : "PM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
}

function formatQuantity(quantity: number, doseForm: string): string {
  const form = quantity === 1 ? doseForm : `${doseForm}s`;
  return `${quantity} ${form}`;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${month}/${day}/${year}`;
}

const routeApi = getRouteApi("/layout/prescriptions/$id");

function PrescriptionDetail() {
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
              edit
            </Link>
            <span aria-hidden="true"> | </span>
            <button onClick={() => setShowDeleteDialog(true)}>delete</button>
          </div>
        </div>
        <dl className="prescription-detail-meta">
          <dt>Strength</dt>
          <dd>{prescription.dosage}</dd>
          <dt>Start date</dt>
          <dd>
            <time dateTime={prescription.startDate}>
              {formatDate(prescription.startDate)}
            </time>
          </dd>
          <dt>End date</dt>
          <dd>
            {prescription.endDate ? (
              <time dateTime={prescription.endDate}>
                {formatDate(prescription.endDate)}
              </time>
            ) : (
              "N/A (On-going)"
            )}
          </dd>
        </dl>
        <section className="prescription-detail-schedule">
          <h3>Schedule</h3>
          {routines.map((routine) => (
            <section
              key={routine.label}
              className="prescription-detail-routine"
            >
              <h4>{routine.label}</h4>
              <table className="prescription-list">
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Dose</th>
                  </tr>
                </thead>
                <tbody>
                  {routine.slots.map((slot) => (
                    <tr key={slot.time}>
                      <td>
                        <time dateTime={slot.time}>
                          {formatTime(slot.time)}
                        </time>
                      </td>
                      <td>
                        {formatQuantity(slot.quantity, prescription.doseForm)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </section>
      </article>
      {showDeleteDialog && (
        <dialog open>
          <p>
            This action is permanent. All dose history for this prescription
            will also be deleted.
          </p>
          <button onClick={() => setShowDeleteDialog(false)}>Cancel</button>
          <button onClick={handleConfirmDelete}>Confirm delete</button>
        </dialog>
      )}
    </>
  );
}

export default PrescriptionDetail;
