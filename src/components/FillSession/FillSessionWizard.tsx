import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Disclaimer } from "./Disclaimer";
import { DoubleCheck } from "./DoubleCheck";
import FillSession, { type FillSessionSnapshot } from "./FillSession";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import { PillOrganizer } from "./PillOrganizer";
import { Setup } from "./Setup";
import { StepIndicator } from "./StepIndicator";
import "./FillSessionWizard.css";

const TOTAL_STEPS = 5;

type WizardStep = 1 | 2 | 3 | 4 | 5;

const STEP_PATHS: Record<
  WizardStep,
  "step1" | "step2" | "step3" | "step4" | "step5"
> = {
  1: "step1",
  2: "step2",
  3: "step3",
  4: "step4",
  5: "step5",
};

const STEP_FROM_PATH: Record<string, WizardStep> = {
  step1: 1,
  step2: 2,
  step3: 3,
  step4: 4,
  step5: 5,
};

const Route = getRouteApi("/layout/fill-session/$step");

function FillSessionWizard() {
  const navigate = useNavigate();
  const { step: stepParam } = Route.useParams();
  const step = STEP_FROM_PATH[stepParam] ?? 1;
  const [organizerType, setOrganizerType] = useState("1");
  const [snapshot, setSnapshot] = useState<FillSessionSnapshot | null>(null);

  const compartments =
    ORGANIZER_OPTIONS.find((o) => o.value === organizerType)?.compartments ??
    ORGANIZER_OPTIONS[0].compartments;

  const goToStep = (nextStep: WizardStep) =>
    navigate({
      to: "/fill-session/$step",
      params: { step: STEP_PATHS[nextStep] },
    });

  useEffect(() => {
    if (step === 5 && !snapshot) {
      navigate({
        to: "/fill-session/$step",
        params: { step: "step4" },
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
          onContinue={() => goToStep(4)}
        />
      )}
      {step === 4 && (
        <FillSession
          compartments={compartments}
          organizerType={organizerType}
          onDone={(nextSnapshot) => {
            setSnapshot(nextSnapshot);
            goToStep(5);
          }}
        />
      )}
      {step === 5 && snapshot && (
        <DoubleCheck
          snapshot={snapshot}
          onBack={() => goToStep(4)}
          onConfirm={() => navigate({ to: "/" })}
        />
      )}
    </main>
  );
}

export default FillSessionWizard;
