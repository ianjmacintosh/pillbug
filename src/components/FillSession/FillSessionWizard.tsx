import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Disclaimer } from "./Disclaimer";
import { DoubleCheck } from "./DoubleCheck";
import FillSession, { type FillSessionSnapshot } from "./FillSession";
import { Setup } from "./Setup";
import { StepIndicator } from "./StepIndicator";
import "./FillSessionWizard.css";

const TOTAL_STEPS = 4;

type WizardStep = 1 | 2 | 3 | 4;

function FillSessionWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<WizardStep>(1);
  const [snapshot, setSnapshot] = useState<FillSessionSnapshot | null>(null);

  return (
    <main className="fill-session-wizard">
      <StepIndicator step={step} totalSteps={TOTAL_STEPS} />
      {step === 1 && <Disclaimer onContinue={() => setStep(2)} />}
      {step === 2 && <Setup onReady={() => setStep(3)} />}
      {step === 3 && (
        <FillSession
          onDone={(nextSnapshot) => {
            setSnapshot(nextSnapshot);
            setStep(4);
          }}
        />
      )}
      {step === 4 && snapshot && (
        <DoubleCheck
          snapshot={snapshot}
          onBack={() => setStep(3)}
          onConfirm={() => navigate({ to: "/" })}
        />
      )}
    </main>
  );
}

export default FillSessionWizard;
