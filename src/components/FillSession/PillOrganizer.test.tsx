import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { PillOrganizer } from "./PillOrganizer";

const START_DATE = "2026-08-02";

function renderPillOrganizer(
  overrides: Partial<ComponentProps<typeof PillOrganizer>> = {},
) {
  return render(
    <PillOrganizer
      value="1"
      onChange={vi.fn()}
      startDate={START_DATE}
      onStartDateChange={vi.fn()}
      onContinue={vi.fn()}
      {...overrides}
    />,
  );
}

describe("PillOrganizer", () => {
  test("defaults to Simple 7-day organizer when value is 1", () => {
    renderPillOrganizer();
    expect(
      (
        screen.getByRole("combobox", {
          name: /pill organizer/i,
        }) as HTMLSelectElement
      ).value,
    ).toBe("1");
  });

  test("lists all four organizer options", () => {
    renderPillOrganizer();
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  test("selecting a different organizer calls onChange with the new value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPillOrganizer({ onChange });
    await user.selectOptions(
      screen.getByRole("combobox", { name: /pill organizer/i }),
      "2",
    );
    expect(onChange).toHaveBeenCalledWith("2");
  });

  test("clicking Continue calls onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    renderPillOrganizer({ onContinue });
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });

  test("shows the session's start date in the date field", () => {
    renderPillOrganizer();
    expect(screen.getByLabelText(/start date/i)).toHaveValue(START_DATE);
  });

  test("Previous week calls onStartDateChange with a week-earlier updater", async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    renderPillOrganizer({ onStartDateChange });
    await user.click(screen.getByRole("button", { name: /previous week/i }));
    const updater = onStartDateChange.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater(START_DATE)).toBe("2026-07-26");
  });

  test("Next week calls onStartDateChange with a week-later updater", async () => {
    const user = userEvent.setup();
    const onStartDateChange = vi.fn();
    renderPillOrganizer({ onStartDateChange });
    await user.click(screen.getByRole("button", { name: /next week/i }));
    const updater = onStartDateChange.mock.calls[0][0];
    expect(updater(START_DATE)).toBe("2026-08-09");
  });
});
