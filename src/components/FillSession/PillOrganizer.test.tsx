import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { PillOrganizer } from "./PillOrganizer";

describe("PillOrganizer", () => {
  test("shows Simple 7-day as the selected organizer when value is 1", () => {
    render(<PillOrganizer value="1" onChange={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.getByText("Simple 7-day")).toBeInTheDocument();
  });

  test("other organizer types are hidden until Change is clicked", () => {
    render(<PillOrganizer value="1" onChange={vi.fn()} onContinue={vi.fn()} />);
    expect(screen.queryByText("7-day AM/PM")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /change pill organizer type/i }),
    ).toBeInTheDocument();
  });

  test("clicking Change pill organizer type opens a picker with all options", async () => {
    const user = userEvent.setup();
    render(<PillOrganizer value="1" onChange={vi.fn()} onContinue={vi.fn()} />);
    await user.click(
      screen.getByRole("button", { name: /change pill organizer type/i }),
    );
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(
      screen.getByRole("radio", { name: /simple 7-day/i }),
    ).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", { name: /7-day am\/pm/i }),
    ).toBeInTheDocument();
  });

  test("selecting a different organizer in the picker calls onChange and closes the picker", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <PillOrganizer value="1" onChange={onChange} onContinue={vi.fn()} />,
    );
    await user.click(
      screen.getByRole("button", { name: /change pill organizer type/i }),
    );
    await user.click(screen.getByRole("radio", { name: /7-day am\/pm/i }));
    expect(onChange).toHaveBeenCalledWith("2");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });

  test("clicking Continue calls onContinue without opening the picker", async () => {
    const user = userEvent.setup();
    const onContinue = vi.fn();
    render(
      <PillOrganizer value="1" onChange={vi.fn()} onContinue={onContinue} />,
    );
    await user.click(screen.getByRole("button", { name: /continue/i }));
    expect(onContinue).toHaveBeenCalled();
  });
});
