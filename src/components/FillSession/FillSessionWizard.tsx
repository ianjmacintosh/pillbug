import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckSupply, type SupplyAnswer } from "./CheckSupply";
import { Disclaimer } from "./Disclaimer";
import { DoubleCheck } from "./DoubleCheck";
import FillSession, { type FillSessionSnapshot } from "./FillSession";
import { medicineCardKey } from "../../../shared/fill-session";
import { nearestSunday } from "../../../shared/week-boundaries";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import { PillOrganizer } from "./PillOrganizer";
import { Setup } from "./Setup";
import { StepIndicator } from "./StepIndicator";
import "./FillSessionWizard.css";

const TOTAL_STEPS = 6;

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_PATHS: Record<
  WizardStep,
  "step1" | "step2" | "step3" | "step4" | "step5" | "step6"
> = {
  1: "step1",
  2: "step2",
  3: "step3",
  4: "step4",
  5: "step5",
  6: "step6",
};

const STEP_FROM_PATH: Record<string, WizardStep> = {
  step1: 1,
  step2: 2,
  step3: 3,
  step4: 4,
  step5: 5,
  step6: 6,
};

const StepRoute = getRouteApi("/layout/fill-session/$step");
const FillSessionRoute = getRouteApi("/layout/fill-session");

function FillSessionWizard() {
  const navigate = useNavigate();
  const { step: stepParam } = StepRoute.useParams();
  const { timezone } = FillSessionRoute.useLoaderData();
  const step = STEP_FROM_PATH[stepParam] ?? 1;
  const [organizerType, setOrganizerType] = useState("1");
  const [startDate, setStartDate] = useState(() => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "UTC",
    }).format(new Date());
    return nearestSunday(today);
  });
  const [excludedMedicines, setExcludedMedicines] = useState<
    { drugName: string; dosage: string }[]
  >([]);
  const [snapshot, setSnapshot] = useState<FillSessionSnapshot | null>(null);

  const compartments =
    ORGANIZER_OPTIONS.find((o) => o.value === organizerType)?.compartments ??
    ORGANIZER_OPTIONS[0].compartments;

  const excludedMedicineKeys = new Set(
    excludedMedicines.map((m) => medicineCardKey(m.drugName, m.dosage)),
  );

  const goToStep = (nextStep: WizardStep) =>
    navigate({
      to: "/fill-session/$step",
      params: { step: STEP_PATHS[nextStep] },
    });

  const handleSupplyContinue = (answers: SupplyAnswer[]) => {
    setExcludedMedicines(
      answers
        .filter((a) => !a.hasEnough)
        .map((a) => ({ drugName: a.drugName, dosage: a.dosage })),
    );
    goToStep(5);
  };

  useEffect(() => {
    if (step === 6 && !snapshot) {
      navigate({
        to: "/fill-session/$step",
        params: { step: "step5" },
        replace: true,
      });
    }
  }, [step, snapshot, navigate]);

  return (
    <main className="fill-session-wizard">
      <StepIndicator step={step} totalSteps={TOTAL_STEPS} />
      {step === 1 && <Disclaimer onContinue={() => goToStep(2)} />}
      {step === 2 && <Setup onReady={() => goToStep(3)} />}
      {step === 3 && (
        <PillOrganizer
          value={organizerType}
          onChange={setOrganizerType}
          startDate={startDate}
          onStartDateChange={setStartDate}
          onContinue={() => goToStep(4)}
        />
      )}
      {step === 4 && (
        <CheckSupply
          compartments={compartments}
          startDate={startDate}
          excludedMedicines={excludedMedicines}
          onContinue={handleSupplyContinue}
        />
      )}
      {(step === 5 || step === 6) && (
        <FillSession
          isActive={step === 5}
          compartments={compartments}
          organizerType={organizerType}
          startDate={startDate}
          excludedMedicineKeys={excludedMedicineKeys}
          onDone={(nextSnapshot) => {
            setSnapshot({ ...nextSnapshot, excludedMedicines });
            goToStep(6);
          }}
        />
      )}
      {step === 6 && snapshot && (
        <DoubleCheck
          snapshot={snapshot}
          onBack={() => goToStep(5)}
          onConfirm={() => navigate({ to: "/" })}
        />
      )}
    </main>
  );
}

export default FillSessionWizard;
