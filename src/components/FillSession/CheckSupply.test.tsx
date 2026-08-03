import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { CheckSupply } from "./CheckSupply";
import { ONE_COMPARTMENT } from "../../../shared/fill-session";

const START_DATE = "2026-08-02";

const METFORMIN = {
  drugName: "Metformin",
  dosage: "500mg",
  schedule: {
    days: {
      monday: [{ time: "08:00", quantity: 1 }],
      tuesday: [{ time: "08:00", quantity: 1 }],
      wednesday: [{ time: "08:00", quantity: 1 }],
      thursday: [{ time: "08:00", quantity: 1 }],
      friday: [{ time: "08:00", quantity: 1 }],
      saturday: [{ time: "08:00", quantity: 1 }],
      sunday: [{ time: "08:00", quantity: 1 }],
    },
  },
};

const LISINOPRIL = {
  drugName: "Lisinopril",
  dosage: "10mg",
  schedule: {
    days: {
      monday: [{ time: "08:00", quantity: 1 }],
    },
  },
};

function mockPrescriptions(...rxs: object[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(rxs), { status: 200 }),
  );
}

function renderCheckSupply(
  overrides: Partial<ComponentProps<typeof CheckSupply>> = {},
) {
  return render(
    <CheckSupply
      compartments={ONE_COMPARTMENT}
      startDate={START_DATE}
      excludedMedicines={[]}
      onContinue={() => {}}
      {...overrides}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CheckSupply", () => {
  test("shows one row per active prescription, weekly pill count over drug name/dosage", async () => {
    mockPrescriptions(METFORMIN);
    renderCheckSupply();
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/7 pills/)).toBeInTheDocument();
    expect(screen.getByText("Metformin")).toBeInTheDocument();
    expect(screen.getByText("500mg")).toBeInTheDocument();
  });

  test("intro copy references the actual session date range, not a generic 'this week'", async () => {
    mockPrescriptions(METFORMIN);
    renderCheckSupply();
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/Aug 2/)).toBeInTheDocument();
    expect(screen.getByText(/Aug 8/)).toBeInTheDocument();
  });

  test("every row defaults checked", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderCheckSupply();
    await waitFor(() => screen.getByText("Metformin"));
    for (const checkbox of screen.getAllByRole("checkbox")) {
      expect(checkbox).toBeChecked();
    }
  });

  test("unchecking a row and continuing reports it as not having enough", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const onContinue = vi.fn();
    const user = userEvent.setup();
    renderCheckSupply({ onContinue });
    await waitFor(() => screen.getByText("Metformin"));

    await user.click(screen.getByRole("checkbox", { name: /metformin/i }));
    await user.click(screen.getByRole("button", { name: /continue/i }));

    expect(onContinue).toHaveBeenCalledWith([
      { drugName: "Metformin", dosage: "500mg", hasEnough: false },
      { drugName: "Lisinopril", dosage: "10mg", hasEnough: true },
    ]);
  });

  test("re-entering the step restores a previously unchecked row as unchecked", async () => {
    mockPrescriptions(METFORMIN);
    renderCheckSupply({
      excludedMedicines: [{ drugName: "Metformin", dosage: "500mg" }],
    });
    await waitFor(() => screen.getByText("Metformin"));
    expect(
      screen.getByRole("checkbox", { name: /metformin/i }),
    ).not.toBeChecked();
  });
});
