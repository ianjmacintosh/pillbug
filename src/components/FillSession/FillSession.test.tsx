import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { ComponentProps } from "react";
import FillSession from "./FillSession";
import {
  medicineCardKey,
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
} from "../../../shared/fill-session";

const START_DATE = "2026-06-14";

function renderFillSession(
  overrides: Partial<ComponentProps<typeof FillSession>> = {},
) {
  return render(
    <FillSession
      compartments={ONE_COMPARTMENT}
      organizerType="1"
      startDate={START_DATE}
      onStartDateChange={vi.fn()}
      {...overrides}
    />,
  );
}

const METFORMIN = {
  id: "rx-1",
  drugName: "Metformin",
  dosage: "500mg",
  doseForm: "tablet",
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
      monday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      tuesday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      wednesday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      thursday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      friday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      saturday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
      sunday: [
        { time: "08:00", quantity: 1 },
        { time: "20:00", quantity: 1 },
      ],
    },
  },
  startDate: "2024-01-01",
  endDate: null,
  status: "active",
};

function mockPrescriptions(...rxs: object[]) {
  vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(rxs), { status: 200 }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FillSession", () => {
  test("renders a heading", () => {
    mockPrescriptions();
    renderFillSession();
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  test("shows a card for each prescription", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderFillSession();
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeTruthy();
      expect(screen.getByText("Lisinopril")).toBeTruthy();
    });
  });

  test("drug names and details for every medicine are in the DOM without interaction", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderFillSession();
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeTruthy();
      expect(screen.getByText("500mg")).toBeTruthy();
      expect(screen.getByText("Lisinopril")).toBeTruthy();
      expect(screen.getByText("10mg")).toBeTruthy();
    });
  });

  test("1-compartment: shows correct pill total on card header", async () => {
    mockPrescriptions(METFORMIN);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/7 pills/)).toBeTruthy();
  });

  test("compartment time ranges are shown inline in each slot label", async () => {
    mockPrescriptions(METFORMIN);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/00:00/)).toBeTruthy();
  });

  test("2-compartment: shows AM and PM slot labels with their time ranges", async () => {
    mockPrescriptions(LISINOPRIL);
    renderFillSession({ compartments: TWO_COMPARTMENTS, organizerType: "2" });
    await waitFor(() => screen.getByText("Lisinopril"));

    await waitFor(() => {
      expect(screen.getByText("AM")).toBeTruthy();
      expect(screen.getByText("PM")).toBeTruthy();
      expect(screen.getByText(/00:00–11:59/)).toBeTruthy();
      expect(screen.getByText(/12:00–23:59/)).toBeTruthy();
    });
  });

  test("all 7 day abbreviations are shown in the grid header", async () => {
    mockPrescriptions(METFORMIN);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    for (const abbr of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByText(abbr)).toBeTruthy();
    }
  });

  test("week starts on Sunday", async () => {
    mockPrescriptions(METFORMIN);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    const headers = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(headers[0].textContent).toBe("Sun");
  });

  test("first medicine is shown by default", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByRole("region", { name: /metformin/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.getByRole("region", { name: /lisinopril/i }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText(/medicine 1 of 2/i)).toBeInTheDocument();
  });

  test("Previous medicine is disabled on the first medicine", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    expect(
      screen.getByRole("button", { name: /previous medicine/i }),
    ).toBeDisabled();
  });

  test("Next medicine advances to the next medicine, Previous returns to the first", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = userEvent.setup();
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));

    await user.click(screen.getByRole("button", { name: /next medicine/i }));

    expect(screen.getByRole("region", { name: /lisinopril/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(
      screen.getByRole("region", { name: /metformin/i }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText(/medicine 2 of 2/i)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /previous medicine/i }),
    );

    expect(screen.getByRole("region", { name: /metformin/i })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByText(/medicine 1 of 2/i)).toBeInTheDocument();
  });

  test("Done filling only appears on the last medicine", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    const user = userEvent.setup();
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));

    expect(
      screen.queryByRole("button", { name: /done filling/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next medicine/i }));

    expect(
      screen.queryByRole("button", { name: /next medicine/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /done filling/i }),
    ).toBeInTheDocument();
  });

  test("shows the date range derived from the startDate prop below the heading", () => {
    mockPrescriptions();
    renderFillSession();
    const dateHeading = screen.getByRole("heading", { level: 2 });
    expect(dateHeading.textContent).toMatch(/Jun 14/); // startDate
    expect(dateHeading.textContent).toMatch(/Jun 20/); // startDate + 6
  });

  test("the date picker reflects the startDate prop, not an internally computed default", () => {
    mockPrescriptions();
    renderFillSession({ startDate: "2026-07-05" });
    expect(screen.getByLabelText(/start date/i)).toHaveValue("2026-07-05");
  });

  test("Previous/Next week call onStartDateChange instead of managing date state internally", async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    mockPrescriptions();
    renderFillSession({ onStartDateChange });

    await user.click(screen.getByRole("button", { name: /previous week/i }));
    expect(onStartDateChange).toHaveBeenCalledTimes(1);
    expect(typeof onStartDateChange.mock.calls[0][0]).toBe("function");

    await user.click(screen.getByRole("button", { name: /next week/i }));
    expect(onStartDateChange).toHaveBeenCalledTimes(2);
  });

  test("medicine card grids render for all cards regardless of the current index", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    renderFillSession();
    await waitFor(() => screen.getByText("Metformin"));
    // Metformin is current — its cell values are in the DOM
    expect(
      within(screen.getByRole("region", { name: /metformin/i })).getAllByText(
        "1",
      )[0],
    ).toBeInTheDocument();
    // Lisinopril is not current — its grid is still rendered (needed for print CSS to reveal it)
    expect(
      within(screen.getByRole("region", { name: /lisinopril/i })).getAllByText(
        "2",
      )[0],
    ).toBeInTheDocument();
  });

  test("renders the date range as a secondary heading", () => {
    mockPrescriptions();
    renderFillSession();
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });

  test("shows a Print Worksheet button", () => {
    mockPrescriptions();
    renderFillSession();
    expect(
      screen.getByRole("button", { name: /print worksheet/i }),
    ).toBeTruthy();
  });

  test("Save as PDF button is disabled", () => {
    mockPrescriptions();
    renderFillSession();
    expect(
      screen.getByRole("button", { name: /save as pdf/i }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  describe("excludedMedicineKeys", () => {
    test("excluded medicines never mount a card", async () => {
      mockPrescriptions(METFORMIN, LISINOPRIL);
      renderFillSession({
        excludedMedicineKeys: new Set([
          medicineCardKey(METFORMIN.drugName, METFORMIN.dosage),
        ]),
      });
      await waitFor(() => screen.getByText("Lisinopril"));
      expect(screen.queryByText("Metformin")).not.toBeInTheDocument();
      expect(screen.getByText(/medicine 1 of 1/i)).toBeInTheDocument();
    });

    test("excluding every medicine shows an explanatory message instead of empty nav", async () => {
      mockPrescriptions(METFORMIN);
      renderFillSession({
        excludedMedicineKeys: new Set([
          medicineCardKey(METFORMIN.drugName, METFORMIN.dosage),
        ]),
      });
      await waitFor(() => {
        expect(screen.getByText(/skipped this session/i)).toBeInTheDocument();
      });
      expect(screen.queryByText("Metformin")).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /next medicine/i }),
      ).not.toBeInTheDocument();
    });

    test("onDone snapshot only contains non-excluded cards", async () => {
      mockPrescriptions(METFORMIN, LISINOPRIL);
      const onDone = vi.fn();
      const user = userEvent.setup();
      renderFillSession({
        excludedMedicineKeys: new Set([
          medicineCardKey(METFORMIN.drugName, METFORMIN.dosage),
        ]),
        onDone,
      });
      await waitFor(() => screen.getByText("Lisinopril"));
      await user.click(screen.getByRole("button", { name: /done filling/i }));

      expect(onDone).toHaveBeenCalledWith(
        expect.objectContaining({
          cards: [expect.objectContaining({ drugName: "Lisinopril" })],
        }),
      );
    });
  });
});
