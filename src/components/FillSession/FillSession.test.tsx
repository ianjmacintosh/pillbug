import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import FillSession from "./FillSession";

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

describe("FillSession", () => {
  test("renders a heading", () => {
    mockPrescriptions();
    render(<FillSession />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });

  test("defaults to 7-day span, 1 compartment per day", async () => {
    mockPrescriptions();
    render(<FillSession />);
    await waitFor(() => {
      expect(
        (screen.getByRole("combobox", { name: /span/i }) as HTMLSelectElement)
          .value,
      ).toBe("7");
      expect(
        (
          screen.getByRole("combobox", {
            name: /compartments per day/i,
          }) as HTMLSelectElement
        ).value,
      ).toBe("1");
    });
  });

  test("shows a row for each day of the week", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => {
      expect(screen.getByRole("row", { name: /monday/i })).toBeTruthy();
      expect(screen.getByRole("row", { name: /sunday/i })).toBeTruthy();
    });
  });

  test("1-compartment: Monday row shows correct pill count", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => {
      const mondayRow = screen.getByRole("row", { name: /monday/i });
      expect(within(mondayRow).getByText("1")).toBeTruthy();
    });
  });

  test("2-compartment: Monday row shows AM and PM counts separately", async () => {
    mockPrescriptions(LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByRole("row", { name: /monday/i }));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /compartments per day/i }),
      "2",
    );

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /^am/i })).toBeTruthy();
      expect(screen.getByRole("columnheader", { name: /^pm/i })).toBeTruthy();
      const mondayRow = screen.getByRole("row", { name: /monday/i });
      const cells = within(mondayRow).getAllByRole("cell");
      const counts = cells.slice(1).map((c) => c.textContent);
      expect(counts).toContain("1"); // AM: 1 Lisinopril
      expect(counts).toContain("1"); // PM: 1 Lisinopril
    });
  });

  test("clicking a day row expands to show per-prescription breakdown", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => screen.getByRole("row", { name: /monday/i }));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /compartments per day/i }),
      "2",
    );

    await userEvent.click(screen.getByRole("row", { name: /monday/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Metformin/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Lisinopril/).length).toBeGreaterThan(0);
    });
  });

  test("compartment time mapping is shown separately from the table", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByRole("row", { name: /monday/i }));

    const mapping = screen.getByRole("region", {
      name: /compartment mapping/i,
    });
    expect(mapping.textContent).toMatch(/00:00/);

    const headers = screen.getAllByRole("columnheader");
    headers.forEach((h) => {
      expect(h.textContent).not.toMatch(/00:00/);
    });
  });

  test("changing span updates the total pills summary", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => screen.getByRole("row", { name: /monday/i }));

    expect(screen.getByText(/total for 7-day/i)).toBeTruthy();

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /span/i }),
      "14",
    );

    await waitFor(() => {
      expect(screen.getByText(/total for 14-day/i)).toBeTruthy();
    });
  });
});
