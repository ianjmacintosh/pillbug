import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import FillSession from "./FillSession";

let mockTimezone: string | null = null;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({ timezone: mockTimezone }),
    }),
  };
});

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

beforeEach(() => {
  mockTimezone = null;
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("FillSession", () => {
  test("renders a heading", () => {
    mockPrescriptions();
    render(<FillSession />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  test("defaults to Simple 7-day organizer", async () => {
    mockPrescriptions();
    render(<FillSession />);
    await waitFor(() => {
      expect(
        (
          screen.getByRole("combobox", {
            name: /pill organizer/i,
          }) as HTMLSelectElement
        ).value,
      ).toBe("1");
    });
  });

  test("shows a card for each prescription", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeTruthy();
      expect(screen.getByText("Lisinopril")).toBeTruthy();
    });
  });

  test("drug names and details are always visible without interaction", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => {
      expect(screen.getByText("Metformin")).toBeTruthy();
      expect(screen.getByText("500mg")).toBeTruthy();
      expect(screen.getByText("Lisinopril")).toBeTruthy();
      expect(screen.getByText("10mg")).toBeTruthy();
    });
  });

  test("1-compartment: shows correct pill total on card header", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/7 pills/)).toBeTruthy();
  });

  test("compartment time ranges are shown inline in each slot label", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    expect(screen.getByText(/00:00/)).toBeTruthy();
  });

  test("2-compartment: shows AM and PM slot labels with their time ranges", async () => {
    mockPrescriptions(LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Lisinopril"));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /pill organizer/i }),
      "2",
    );

    await waitFor(() => {
      expect(screen.getByText("AM")).toBeTruthy();
      expect(screen.getByText("PM")).toBeTruthy();
      expect(screen.getByText(/00:00–11:59/)).toBeTruthy();
      expect(screen.getByText(/12:00–23:59/)).toBeTruthy();
    });
  });

  test("all 7 day abbreviations are shown in the grid header", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    for (const abbr of ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]) {
      expect(screen.getByText(abbr)).toBeTruthy();
    }
  });

  test("week starts on Sunday", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    const headers = screen.getAllByText(/^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/);
    expect(headers[0].textContent).toBe("Sun");
  });

  test("first card is open by default", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    const metforminHeader = screen.getByText("Metformin").closest("button")!;
    expect(metforminHeader.getAttribute("aria-expanded")).toBe("true");
    const lisinoprilHeader = screen.getByText("Lisinopril").closest("button")!;
    expect(lisinoprilHeader.getAttribute("aria-expanded")).toBe("false");
  });

  test("clicking a closed card opens it and closes the previously open card", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));

    const lisinoprilHeader = screen.getByText("Lisinopril").closest("button")!;
    await userEvent.click(lisinoprilHeader);

    await waitFor(() => {
      expect(lisinoprilHeader.getAttribute("aria-expanded")).toBe("true");
      const metforminHeader = screen.getByText("Metformin").closest("button")!;
      expect(metforminHeader.getAttribute("aria-expanded")).toBe("false");
    });
  });

  test("shows nearest-Sunday-anchored date range below the heading", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-11T00:00:00Z")); // Thursday → nearest Sunday is Jun 14
    try {
      mockPrescriptions();
      render(<FillSession />);
      const dateHeading = screen.getByRole("heading", { level: 2 });
      expect(dateHeading.textContent).toMatch(/Jun 14/); // start: nearest Sunday
      expect(dateHeading.textContent).toMatch(/Jun 20/); // end: startDate + 6
    } finally {
      vi.useRealTimers();
    }
  });

  test("computes the current week using the patient's timezone, not UTC", () => {
    // 2026-07-06T02:58 UTC is Monday in UTC but still Sunday, Jul 5,
    // 21:58 in America/Chicago (UTC-5 in July). The date range must be
    // anchored to the patient's local day, not the UTC day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-06T02:58:00Z"));
    mockTimezone = "America/Chicago";
    try {
      mockPrescriptions();
      render(<FillSession />);
      const dateHeading = screen.getByRole("heading", { level: 2 });
      expect(dateHeading.textContent).toMatch(/Jul 5/);
      expect(dateHeading.textContent).toMatch(/Jul 11/);
    } finally {
      vi.useRealTimers();
    }
  });

  test("medicine card grids render for all cards regardless of open state", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));
    // Metformin is open — its cell values are in the DOM
    expect(
      within(screen.getByRole("region", { name: /metformin/i })).getAllByText(
        "1",
      )[0],
    ).toBeInTheDocument();
    // Lisinopril is closed — its grid is still rendered (needed for print CSS to reveal it)
    expect(
      within(screen.getByRole("region", { name: /lisinopril/i })).getAllByText(
        "2",
      )[0],
    ).toBeInTheDocument();
  });

  test("renders the date range as a secondary heading", () => {
    mockPrescriptions();
    render(<FillSession />);
    expect(screen.getByRole("heading", { level: 2 })).toBeTruthy();
  });

  test("shows a Print Worksheet button", () => {
    mockPrescriptions();
    render(<FillSession />);
    expect(
      screen.getByRole("button", { name: /print worksheet/i }),
    ).toBeTruthy();
  });

  test("clicking an open card closes it", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByText("Metformin"));

    const header = screen.getByText("Metformin").closest("button")!;
    expect(header.getAttribute("aria-expanded")).toBe("true");

    await userEvent.click(header);
    expect(header.getAttribute("aria-expanded")).toBe("false");
  });
});
