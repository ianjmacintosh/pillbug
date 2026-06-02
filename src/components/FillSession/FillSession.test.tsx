import { render, screen, waitFor } from "@testing-library/react";
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

  test("shows one row per prescription", async () => {
    mockPrescriptions(METFORMIN, LISINOPRIL);
    render(<FillSession />);
    await waitFor(() => {
      expect(screen.getByText(/Metformin/)).toBeTruthy();
      expect(screen.getByText(/Lisinopril/)).toBeTruthy();
    });
  });

  test("1-compartment 7-day: shows total pills per prescription in Daily column", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);
    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /daily/i })).toBeTruthy();
      const rows = screen.getAllByRole("row");
      const metforminRow = rows.find((r) =>
        r.textContent?.includes("Metformin"),
      );
      expect(metforminRow?.textContent).toContain("7");
    });
  });

  test("2-compartment 7-day: splits pills into AM and PM columns", async () => {
    mockPrescriptions(LISINOPRIL);
    render(<FillSession />);

    await waitFor(() => screen.getByText(/Lisinopril/));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /compartments per day/i }),
      "2",
    );

    await waitFor(() => {
      expect(screen.getByRole("columnheader", { name: /^am/i })).toBeTruthy();
      expect(screen.getByRole("columnheader", { name: /^pm/i })).toBeTruthy();
      const rows = screen.getAllByRole("row");
      const row = rows.find((r) => r.textContent?.includes("Lisinopril"));
      expect(row?.textContent).toContain("7"); // 7 AM
      expect(row?.textContent).toContain("7"); // 7 PM
    });
  });

  test("changing span recalculates without page reload", async () => {
    mockPrescriptions(METFORMIN);
    render(<FillSession />);

    await waitFor(() => screen.getByText(/Metformin/));

    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: /span/i }),
      "14",
    );

    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      const row = rows.find((r) => r.textContent?.includes("Metformin"));
      expect(row?.textContent).toContain("14");
    });
  });
});
