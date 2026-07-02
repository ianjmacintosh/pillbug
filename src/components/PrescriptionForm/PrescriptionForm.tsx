import { useRef, useState, useEffect } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ScrollText } from "lucide-react";
import { Button } from "../Button/Button";
import { PrescriptionFields } from "./PrescriptionFields";
import { usePrescriptionForm } from "./usePrescriptionForm";
import type { PrescriptionFormData } from "./PrescriptionForm.types";

export type { PrescriptionFormData } from "./PrescriptionForm.types";

function useIsFormActionsStuck(
  formActionsRef: React.RefObject<HTMLDivElement | null>,
) {
  const [isStuck, setIsStuck] = useState(false);
  useEffect(() => {
    const el = formActionsRef.current;
    if (!el) return;
    function check() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const stickyBottom = parseFloat(getComputedStyle(el).bottom) || 0;
      setIsStuck(
        Math.abs(rect.bottom - (window.innerHeight - stickyBottom)) < 2,
      );
    }
    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [formActionsRef]);
  return isStuck;
}

export function NewPrescriptionForm() {
  const { t } = useTranslation();
  const form = usePrescriptionForm();
  const navigate = useNavigate();
  const formActionsRef = useRef<HTMLDivElement>(null);
  const isStuck = useIsFormActionsStuck(formActionsRef);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.scheduleEditor.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch("/api/v1/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseForm: form.doseForm,
        drugName: form.drugName,
        dosage: form.buildDosage(),
        schedule: form.scheduleEditor.buildSchedule(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        instructions: form.instructions || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as PrescriptionFormData;
      await navigate({
        to: "/prescriptions/$id",
        params: { id: created.id },
      });
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  const fieldLabels: Record<"drugName" | "dosingDays", string> = {
    drugName: t("prescriptionForm.fieldDrugName"),
    dosingDays: t("prescriptionForm.fieldDosingDays"),
  };

  return (
    <section>
      <h2>{t("prescriptionForm.addHeading")}</h2>
      <form onSubmit={handleCreate}>
        {form.error && <p role="alert">{form.error}</p>}
        <PrescriptionFields
          idPrefix="create"
          scheduleEditor={form.scheduleEditor}
          doseForm={form.doseForm}
          setDoseForm={form.setDoseForm}
          drugName={form.drugName}
          setDrugName={form.setDrugName}
          dosageQuantity={form.dosageQuantity}
          setDosageQuantity={form.setDosageQuantity}
          dosageUnit={form.dosageUnit}
          setDosageUnit={form.setDosageUnit}
          dosageFallback={form.dosageFallback}
          setDosageFallback={form.setDosageFallback}
          startDate={form.startDate}
          setStartDate={form.setStartDate}
          endDate={form.endDate}
          setEndDate={form.setEndDate}
          instructions={form.instructions}
          setInstructions={form.setInstructions}
          detectedDuplicateUnit={form.detectedDuplicateUnit}
          setDetectedDuplicateUnit={form.setDetectedDuplicateUnit}
        />
        <div
          ref={formActionsRef}
          className={`form-actions${isStuck ? " form-actions--stuck" : ""}`}
        >
          <Button
            type="submit"
            disabled={form.submitting}
            className="button-primary button-leading-icon"
          >
            <ScrollText size={18} aria-hidden="true" />
            {form.submitting
              ? t("prescriptionForm.saving")
              : t("prescriptionForm.save")}
          </Button>
          {form.missingFields.length > 0 && (
            <span
              className="form-missing-hint"
              role="status"
              aria-live="polite"
            >
              {t("prescriptionForm.stillNeeded", {
                fields: form.missingFields
                  .map((f) => fieldLabels[f])
                  .join(", "),
              })}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

const editRouteApi = getRouteApi("/layout/prescriptions/$id/edit");

export function EditPrescriptionForm() {
  const { t } = useTranslation();
  const prescription = editRouteApi.useLoaderData() as PrescriptionFormData;
  const { id } = editRouteApi.useParams();
  const form = usePrescriptionForm(prescription);
  const navigate = useNavigate();
  const formActionsRef = useRef<HTMLDivElement>(null);
  const isStuck = useIsFormActionsStuck(formActionsRef);

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    form.setError(null);
    if (!form.scheduleEditor.validateSchedule()) return;

    form.setSubmitting(true);
    const res = await fetch(`/api/v1/prescriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doseForm: form.doseForm,
        drugName: form.drugName,
        dosage: form.buildDosage(),
        schedule: form.scheduleEditor.buildSchedule(),
        startDate: form.startDate,
        endDate: form.endDate || null,
        instructions: form.instructions || null,
      }),
    });

    if (res.ok) {
      await navigate({ to: "/prescriptions/$id", params: { id } });
    } else {
      const data = (await res.json()) as { error: string };
      form.setError(data.error);
      form.setSubmitting(false);
    }
  }

  const fieldLabels: Record<"drugName" | "dosingDays", string> = {
    drugName: t("prescriptionForm.fieldDrugName"),
    dosingDays: t("prescriptionForm.fieldDosingDays"),
  };

  return (
    <section>
      <h2>{t("prescriptionForm.editHeading")}</h2>
      <form onSubmit={handleSaveEdit}>
        {form.error && <p role="alert">{form.error}</p>}
        <PrescriptionFields
          idPrefix="edit"
          scheduleEditor={form.scheduleEditor}
          doseForm={form.doseForm}
          setDoseForm={form.setDoseForm}
          drugName={form.drugName}
          setDrugName={form.setDrugName}
          dosageQuantity={form.dosageQuantity}
          setDosageQuantity={form.setDosageQuantity}
          dosageUnit={form.dosageUnit}
          setDosageUnit={form.setDosageUnit}
          dosageFallback={form.dosageFallback}
          setDosageFallback={form.setDosageFallback}
          startDate={form.startDate}
          setStartDate={form.setStartDate}
          endDate={form.endDate}
          setEndDate={form.setEndDate}
          instructions={form.instructions}
          setInstructions={form.setInstructions}
          detectedDuplicateUnit={form.detectedDuplicateUnit}
          setDetectedDuplicateUnit={form.setDetectedDuplicateUnit}
        />
        <div
          ref={formActionsRef}
          className={`form-actions${isStuck ? " form-actions--stuck" : ""}`}
        >
          <Button
            type="submit"
            disabled={form.submitting}
            className="button-primary button-leading-icon"
          >
            <ScrollText size={18} aria-hidden="true" />
            {form.submitting
              ? t("prescriptionForm.saving")
              : t("prescriptionForm.save")}
          </Button>
          {form.missingFields.length > 0 && (
            <span
              className="form-missing-hint"
              role="status"
              aria-live="polite"
            >
              {t("prescriptionForm.stillNeeded", {
                fields: form.missingFields
                  .map((f) => fieldLabels[f])
                  .join(", "),
              })}
            </span>
          )}
        </div>
      </form>
    </section>
  );
}
