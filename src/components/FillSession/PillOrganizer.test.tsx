import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PillOrganizer } from "./PillOrganizer";

describe("PillOrganizer", () => {
  test("defaults to Simple 7-day organizer when value is 1", () => {
    render(<PillOrganizer value="1" onChange={vi.fn()} onContinue={vi.fn()} />);
    expect(
      (
        screen.getByRole("combobox", {
          name: /pill organizer/i,
        }) as HTMLSelectElement
      ).value,
    ).toBe("1");
  });

  test("lists all four organizer options", () => {
    render(<PillOrganizer value="1" onChange={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  test("selecting a different organizer calls onChange with the new value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillOrganizer value="1" onChange={onChange} onContinue={vi.fn()} />,
    );
    await user.selectOptions(
      screen.getByRole("combobox", { name: /pill organizer/i }),
      "2",
    );
    expect(onChange).toHaveBeenCalledWith("2");
  });

  test("clicking Continue calls onContinue", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <PillOrganizer value="1" onChange={vi.fn()} onContinue={onContinue} />,
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });
});
