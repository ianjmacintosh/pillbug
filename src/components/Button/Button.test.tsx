import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { Button } from "./Button";

// Flush the deferred setTimeout(0) used to register the document dismiss listener
function flushDeferred() {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("Button — soft-disabled (disabledReason)", () => {
  test("renders as aria-disabled, not natively disabled", () => {
    render(
      <Button
        disabled
        disabledReason="Drug name is required"
        className="button-primary"
      >
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).not.toBeDisabled();
  });

  test("shows tooltip with disabledReason text on click", async () => {
    render(
      <Button
        disabled
        disabledReason="Drug name is required"
        className="button-primary"
      >
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Drug name is required",
    );
  });

  test("tooltip persists until a document click dismisses it", async () => {
    render(
      <div>
        <Button
          disabled
          disabledReason="Drug name is required"
          className="button-primary"
        >
          Save
        </Button>
        <button>Elsewhere</button>
      </div>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Let the deferred document listener register before clicking elsewhere
    await flushDeferred();
    await userEvent.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("does not steal focus on click", async () => {
    render(
      <div>
        <input aria-label="Drug name" />
        <Button
          disabled
          disabledReason="Drug name is required"
          className="button-primary"
        >
          Save
        </Button>
      </div>,
    );
    const input = screen.getByLabelText("Drug name");
    await userEvent.click(input);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(document.activeElement).toBe(input);
  });

  test("adds button--blocked class on click and removes it after animation", async () => {
    render(
      <Button
        disabled
        disabledReason="Drug name is required"
        className="button-primary"
      >
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    await userEvent.click(btn);
    expect(btn).toHaveClass("button--blocked");
    await waitFor(() => expect(btn).not.toHaveClass("button--blocked"), {
      timeout: 500,
    });
  });

  test("calls onDisabledClick callback on click", async () => {
    const callback = vi.fn();
    render(
      <Button
        disabled
        disabledReason="Still needed"
        onDisabledClick={callback}
        className="button-primary"
      >
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(callback).toHaveBeenCalledOnce();
  });

  test("no tooltip when disabledReason is absent even if onDisabledClick is set", async () => {
    render(
      <Button disabled onDisabledClick={vi.fn()} className="button-primary">
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Button — onDisabledClick alone (backward compat)", () => {
  test("is soft-disabled: aria-disabled, clickable, calls callback", async () => {
    const callback = vi.fn();
    render(
      <Button disabled onDisabledClick={callback} className="button-primary">
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).not.toBeDisabled();
    await userEvent.click(btn);
    expect(callback).toHaveBeenCalledOnce();
  });
});

describe("Button — hard disabled", () => {
  test("is natively disabled when no disabledReason or onDisabledClick", () => {
    render(
      <Button disabled className="button-primary">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
