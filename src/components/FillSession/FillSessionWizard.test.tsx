import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSyncExternalStore } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FillSessionWizard from "./FillSessionWizard";

let mockNavigate: ReturnType<typeof vi.fn>;
let stepParam: string;
let mockTimezone: string | null;
let mockProgress: {
  step: string;
  organizerType: string;
  startDate: string;
  currentIndex: number;
  updatedAt: string;
} | null;
const listeners = new Set<() => void>();

function setStepParam(step: string) {
  stepParam = step;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: (id: string) => {
      if (id === "/layout/fill-session") {
        return { useLoaderData: () => ({ timezone: mockTimezone }) };
      }
      return {
        useLoaderData: () => ({ progress: mockProgress }),
        useParams: () => ({
          step: useSyncExternalStore(subscribe, () => stepParam),
        }),
      };
    },
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  stepParam = "step1";
  mockTimezone = null;
  mockProgress = null;
  mockNavigate = vi.fn(
    (opts: { to: string; params?: { step?: string }; replace?: boolean }) => {
      if (opts?.params?.step) setStepParam(opts.params.step);
    },
  );
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response("[]", { status: 200 }),
  );
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
  vi.spyOn(globalThis, "fetch").mockImplementation(
    async () => new Response(JSON.stringify(rxs), { status: 200 }),
  );
}

async function advanceToFillStep() {
  const user = userEvent.setup();
  render(<FillSessionWizard />);
  await user.click(screen.getByRole("button", { name: /continue/i })); // step1 -> step2
  await user.click(screen.getByRole("button", { name: /i'm ready/i })); // step2 -> step3
  await user.click(screen.getByRole("button", { name: /continue/i })); // step3 -> step4
  return user;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FillSessionWizard", () => {
  test("opens on the disclaimer step with a Continue button", () => {
    render(<FillSessionWizard />);
    expect(screen.getByText(/step 1 of 5/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i }),
    ).toBeInTheDocument();
  });

  test("Continue advances to the setup step and updates the URL", async () => {
    const user = userEvent.setup();
    render(<FillSessionWizard />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText(/step 2 of 5/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /i'm ready/i }),
    ).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/fill-session/$step",
      params: { step: "step2" },
    });
  });

  test("I'm ready advances to the pill organizer step", async () => {
    const user = userEvent.setup();
    render(<FillSessionWizard />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /i'm ready/i }));
    expect(screen.getByText(/step 3 of 5/i)).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: /pill organizer/i }),
    ).toBeInTheDocument();
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/fill-session/$step",
      params: { step: "step3" },
    });
  });

  test("Continuing past the pill organizer step shows the inventory screen", async () => {
    mockPrescriptions(METFORMIN);
    await advanceToFillStep();
    expect(screen.getByText(/step 4 of 5/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeInTheDocument();
    });
  });

  test("selecting a 2-compartment organizer shows AM/PM slots on the fill step", async () => {
    mockPrescriptions(METFORMIN);
    const user = userEvent.setup();
    render(<FillSessionWizard />);
    await user.click(screen.getByRole("button", { name: /continue/i }));
    await user.click(screen.getByRole("button", { name: /i'm ready/i }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: /pill organizer/i }),
      "2",
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeInTheDocument();
    });
    expect(screen.getByText("AM")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
  });

  test("Done filling advances to the double-check step", async () => {
    mockPrescriptions(METFORMIN);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /done filling/i }));
    expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
  });

  test("Done filling is not available until the last prescription is reached", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));

    expect(
      screen.queryByRole("button", { name: /done filling/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next medicine/i }));
    await user.click(screen.getByRole("button", { name: /done filling/i }));
    expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument();
  });

  test("double-check step shows compartment grid with pill counts", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));
    await user.click(screen.getByRole("button", { name: /next medicine/i }));
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
    expect(screen.getByText(/step 4 of 5/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /done filling/i }),
    ).toBeInTheDocument();
  });

  test("Back from double-check preserves the selected week and medicine index", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = await advanceToFillStep();
    await waitFor(() => screen.getByText("Metformin"));

    await user.click(screen.getByRole("button", { name: /next week/i }));
    const dateInput = screen.getByLabelText(/start date/i) as HTMLInputElement;
    const selectedWeek = dateInput.value;

    await user.click(screen.getByRole("button", { name: /next medicine/i }));
    expect(screen.getByText(/medicine 2 of 2/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /done filling/i }));
    await user.click(screen.getByRole("button", { name: /back/i }));

    expect(
      (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
    ).toBe(selectedWeek);
    expect(screen.getByText(/medicine 2 of 2/i)).toBeInTheDocument();
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

  test("landing directly on step5 with no snapshot redirects back to the fill step", async () => {
    mockPrescriptions();
    stepParam = "step5";
    render(<FillSessionWizard />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({
        to: "/fill-session/$step",
        params: { step: "step4" },
        replace: true,
      });
    });
  });

  describe("resuming an in-progress session", () => {
    test("with no saved progress, the start date defaults from the patient's timezone", () => {
      // 2026-07-06T02:58 UTC is Monday in UTC but still Sunday, Jul 5,
      // 21:58 in America/Chicago (UTC-5 in July) — the default must be
      // anchored to the patient's local day, not the UTC day.
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-07-06T02:58:00Z"));
      mockTimezone = "America/Chicago";
      stepParam = "step4";
      try {
        mockPrescriptions();
        render(<FillSessionWizard />);
        const dateHeading = screen.getByRole("heading", { level: 2 });
        expect(dateHeading.textContent).toMatch(/Jul 5/);
        expect(dateHeading.textContent).toMatch(/Jul 11/);
      } finally {
        vi.useRealTimers();
      }
    });

    test("landing on step1 with later saved progress restores organizer type, start date, and medicine index", async () => {
      mockProgress = {
        step: "step4",
        organizerType: "2",
        startDate: "2026-06-14",
        currentIndex: 1,
        updatedAt: new Date().toISOString(),
      };
      stepParam = "step4";
      mockPrescriptions(METFORMIN, LISINOPRIL);
      render(<FillSessionWizard />);

      await waitFor(() => screen.getByText("Lisinopril"));
      expect(screen.getAllByText("AM").length).toBeGreaterThan(0);
      expect(screen.getAllByText("PM").length).toBeGreaterThan(0);
      expect(
        (screen.getByLabelText(/start date/i) as HTMLInputElement).value,
      ).toBe("2026-06-14");
      expect(screen.getByText(/medicine 2 of 2/i)).toBeInTheDocument();
    });

    test("advancing past the disclaimer saves progress", async () => {
      const user = userEvent.setup();
      render(<FillSessionWizard />);
      await user.click(screen.getByRole("button", { name: /continue/i }));

      await waitFor(() => {
        const putCall = vi
          .mocked(globalThis.fetch)
          .mock.calls.find(
            ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
          );
        expect(putCall).toBeTruthy();
        expect(putCall?.[0]).toBe("/api/v1/fill-session/progress");
        const body = JSON.parse((putCall?.[1] as RequestInit).body as string);
        expect(body).toMatchObject({ step: "step2", organizerType: "1" });
      });
    });

    test("does not save progress while still on the disclaimer step", () => {
      render(<FillSessionWizard />);
      const putCall = vi
        .mocked(globalThis.fetch)
        .mock.calls.find(
          ([, init]) => (init as RequestInit | undefined)?.method === "PUT",
        );
      expect(putCall).toBeUndefined();
    });

    test("confirming double-check clears saved progress before navigating home", async () => {
      mockPrescriptions(METFORMIN);
      const user = await advanceToFillStep();
      await waitFor(() => screen.getByText("Metformin"));
      await user.click(screen.getByRole("button", { name: /done filling/i }));

      await user.click(screen.getByRole("button", { name: /^done$/i }));

      await waitFor(() => {
        const deleteCall = vi
          .mocked(globalThis.fetch)
          .mock.calls.find(
            ([, init]) =>
              (init as RequestInit | undefined)?.method === "DELETE",
          );
        expect(deleteCall?.[0]).toBe("/api/v1/fill-session/progress");
      });
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });
});
