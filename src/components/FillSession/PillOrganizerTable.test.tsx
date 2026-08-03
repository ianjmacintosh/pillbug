import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { TWO_COMPARTMENTS } from "../../../shared/fill-session";
import { PillOrganizerTable } from "./PillOrganizerTable";

const COLUMN_DATES: Record<string, { date: string; wrapped: boolean }> = {
  sunday: { date: "2026-08-02", wrapped: false },
  monday: { date: "2026-07-27", wrapped: true },
  tuesday: { date: "2026-07-28", wrapped: true },
  wednesday: { date: "2026-07-29", wrapped: true },
  thursday: { date: "2026-07-30", wrapped: true },
  friday: { date: "2026-07-31", wrapped: true },
  saturday: { date: "2026-08-01", wrapped: true },
};

function renderTable(
  overrides: Partial<ComponentProps<typeof PillOrganizerTable>> = {},
) {
  return render(
    <PillOrganizerTable
      compartments={TWO_COMPARTMENTS}
      columnDates={COLUMN_DATES}
      renderCell={() => null}
      {...overrides}
    />,
  );
}

describe("PillOrganizerTable", () => {
  test("renders a day-abbreviation header with its date for all seven days", () => {
    renderTable();
    expect(screen.getByText("Sun")).toBeInTheDocument();
    expect(screen.getByText("Aug 2")).toBeInTheDocument();
    expect(screen.getByText("Mon")).toBeInTheDocument();
    expect(screen.getByText("Jul 27")).toBeInTheDocument();
    expect(screen.getByText("Sat")).toBeInTheDocument();
    expect(screen.getByText("Aug 1")).toBeInTheDocument();
  });

  test("renders a label and time range for each compartment", () => {
    renderTable();
    expect(screen.getByText("AM")).toBeInTheDocument();
    expect(screen.getByText("00:00–11:59")).toBeInTheDocument();
    expect(screen.getByText("PM")).toBeInTheDocument();
    expect(screen.getByText("12:00–23:59")).toBeInTheDocument();
  });

  test("calls renderCell once for every compartment/day pair with the right coordinates", () => {
    const renderCell = vi.fn().mockReturnValue(null);
    renderTable({ renderCell });

    expect(renderCell).toHaveBeenCalledTimes(TWO_COMPARTMENTS.length * 7);
    expect(renderCell).toHaveBeenCalledWith(
      expect.objectContaining({
        compartment: TWO_COMPARTMENTS[0],
        compIdx: 0,
        day: "sunday",
        dayIdx: 0,
      }),
    );
    expect(renderCell).toHaveBeenCalledWith(
      expect.objectContaining({
        compartment: TWO_COMPARTMENTS[1],
        compIdx: 1,
        day: "saturday",
        dayIdx: 6,
      }),
    );
  });

  test("renders each cell's renderCell output", () => {
    renderTable({
      renderCell: ({ compartment, day }) => (
        <span>{`${compartment.label}-${day}`}</span>
      ),
    });

    expect(screen.getByText("AM-sunday")).toBeInTheDocument();
    expect(screen.getByText("PM-saturday")).toBeInTheDocument();
  });

  test("applies cellClassName's result alongside the base cell class", () => {
    const { container } = renderTable({
      cellClassName: ({ day }) =>
        day === "sunday" ? "custom-empty" : undefined,
    });

    const cells = container.querySelectorAll(".pill-organizer-table-cell");
    const emptyCells = container.querySelectorAll(
      ".pill-organizer-table-cell.custom-empty",
    );
    expect(cells).toHaveLength(TWO_COMPARTMENTS.length * 7);
    expect(emptyCells).toHaveLength(TWO_COMPARTMENTS.length);
  });

  test("does not show a wrap icon or wrapped styling when showWrapIndicator is omitted", () => {
    const { container } = renderTable();
    expect(
      screen.queryByTitle(/date from the following week/i),
    ).not.toBeInTheDocument();
    expect(
      container.querySelectorAll(".pill-organizer-table-day-header--wrapped"),
    ).toHaveLength(0);
  });

  test("shows a wrap icon and wrapped styling for wrapped days when showWrapIndicator is set", () => {
    const { container } = renderTable({ showWrapIndicator: true });

    const wrapIcons = screen.getAllByTitle(/date from the following week/i);
    expect(wrapIcons).toHaveLength(6);
    expect(
      container.querySelectorAll(".pill-organizer-table-day-header--wrapped"),
    ).toHaveLength(6);
  });
});
