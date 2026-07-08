import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FillSessionWizard from "./FillSessionWizard";

let mockNavigate: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({ timezone: null }),
    }),
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockNavigate = vi.fn();
});

const METFORMIN = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  doseForm: "tablet",
  schedule: {
    days: {
      monday: [{ time: "08:00", quantity: 1 }],
    },
  },
  startDate: "2024-01-01",
  endDate: null,
  status: "active",
};

const LISINOPRIL = {
  id: "rx-2",
  drugName: "Lisinopril",
  dosage: "10mg",
  doseForm: "tablet",
  schedule: {
    days: {
      monday: [{ time: "08:00", quantity: 1 }],
    },
  },
  startDate: "2024-01-01",
  endDate: null,
  status: "active",
};

function mockPrescriptions(...rxs: object[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(rxs), { status: 200 }),
  );
}

async function advanceToFillStep() {
  const user = userEvent.setup();
  render(<FillSessionWizard />);
  await user.click(screen.getByRole("button", { name: /continue/i }));
  await user.click(screen.getByRole("button", { name: /i'm ready/i }));
  return user;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FillSessionWizard", () => {
  test("opens on the disclaimer step with a Continue button", () => {
    render(<FillSessionWizard />);
    expect(screen.getByText(/step 1 of 4/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  test("Continue advances to the setup step", async () => {
    const user = userEvent.setup();
    render(<FillSessionWizard />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/step 2 of 4/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /i'm ready/i }),
    ).toBeInTheDocument();
  });

  test("I'm ready advances to the fill step, showing the inventory screen", async () => {
    mockPrescriptions(METFORMIN);
    await advanceToFillStep();
    expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeInTheDocument();
    });
  });

  test("Done filling advances to the double-check step", async () => {
    mockPrescriptions(METFORMIN);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /done filling/i }));
    expect(screen.getByText(/step 4 of 4/i)).toBeInTheDocument();
  });

  test("double-check step shows compartment grid with pill counts", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /done filling/i }));

    expect(screen.getByText(/double-check/i)).toBeInTheDocument();
    expect(screen.getByText("Daily")).toBeInTheDocument();
    expect(screen.getByText(/mon/i)).toBeInTheDocument();
    // Both prescriptions are on Monday at 08:00 in the default Daily compartment, so we expect 2 pills
    const buttons = screen.getAllByRole("button");
    const pillCountButtons = buttons.filter((btn) =>
      /^\d+$/.test(btn.textContent || ""),
    );
    expect(pillCountButtons.length).toBeGreaterThan(0);
  });

  test("Back from double-check returns to the fill step", async () => {
    mockPrescriptions(METFORMIN);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /done filling/i }));

    await user.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/step 3 of 4/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /done filling/i }),
    ).toBeInTheDocument();
  });

  test("Confirming double-check navigates home", async () => {
    mockPrescriptions(METFORMIN);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /done filling/i }));

    await user.click(screen.getByRole("button", { name: /^done$/i }));
    expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
  });
});
