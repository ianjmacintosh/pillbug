import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { nearestSunday } from "../../../shared/week-boundaries";
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
const ParentRoute = getRouteApi("/layout/fill-session");

function saveProgress(
  step: WizardStep,
  organizerType: string,
  startDate: string,
  currentIndex: number,
) {
  void fetch("/api/v1/fill-session/progress", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      step: STEP_PATHS[step],
      organizerType,
      startDate,
      currentIndex,
    }),
  }).catch(() => {});
}

function FillSessionWizard() {
  const navigate = useNavigate();
  const { step: stepParam } = Route.useParams();
  const { progress } = Route.useLoaderData();
  const { timezone } = ParentRoute.useLoaderData();
  const step = STEP_FROM_PATH[stepParam] ?? 1;

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone ?? "UTC",
  }).format(new Date());

  const [organizerType, setOrganizerType] = useState(
    progress?.organizerType ?? "1",
  );
  const [startDate, setStartDate] = useState(
    progress?.startDate ?? nearestSunday(today),
  );
  const [currentIndex, setCurrentIndex] = useState(progress?.currentIndex ?? 0);
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

  // Persist progress once the Patient has moved past the disclaimer, so an
  // interrupted session (screen sleep, app switch, lost cookie) can be
  // resumed instead of restarting from scratch.
  useEffect(() => {
    if (step === 1) return;
    saveProgress(step, organizerType, startDate, currentIndex);
  }, [step, organizerType, startDate, currentIndex]);

  const handleConfirm = async () => {
    try {
      await fetch("/api/v1/fill-session/progress", { method: "DELETE" });
    } catch {
      // Best-effort — a stale progress row just means the next login shows
      // a resume redirect for an already-completed session, which is
      // harmless.
    }
    navigate({ to: "/" });
  };

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
      {(step === 4 || step === 5) && (
        <FillSession
          isActive={step === 4}
          compartments={compartments}
          organizerType={organizerType}
          startDate={startDate}
          onStartDateChange={setStartDate}
          currentIndex={currentIndex}
          onCurrentIndexChange={setCurrentIndex}
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
          onConfirm={handleConfirm}
        />
      )}
    </main>
  );
}

export default FillSessionWizard;
