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
      <Button disabled disabledReason="Drug name is required" variant="primary">
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("aria-disabled", "true");
    expect(btn).not.toBeDisabled();
  });

  test("shows tooltip with disabledReason text on click", async () => {
    render(
      <Button disabled disabledReason="Drug name is required" variant="primary">
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
          variant="primary"
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
          variant="primary"
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
      <Button disabled disabledReason="Drug name is required" variant="primary">
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
        variant="primary"
      >
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(callback).toHaveBeenCalledOnce();
  });

  test("no tooltip when disabledReason is absent even if onDisabledClick is set", async () => {
    render(
      <Button disabled onDisabledClick={vi.fn()} variant="primary">
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
      <Button disabled onDisabledClick={callback} variant="primary">
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
      <Button disabled variant="primary">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});

describe("Button — typed variant props", () => {
  test.each([
    ["primary", "button-primary"],
    ["secondary", "button-secondary"],
    ["danger", "button-danger"],
  ] as const)("variant=%s applies %s", (variant, expectedClass) => {
    render(<Button variant={variant}>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      expectedClass,
    );
  });

  test('variant="none" applies no color class', () => {
    render(<Button variant="none">Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).not.toHaveClass("button-primary");
    expect(btn).not.toHaveClass("button-secondary");
    expect(btn).not.toHaveClass("button-danger");
  });

  test('size="sm" applies button-sm', () => {
    render(
      <Button variant="primary" size="sm">
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "button-sm",
    );
  });

  test("iconOnly applies button-icon", () => {
    render(
      <Button variant="danger" iconOnly aria-label="Delete">
        X
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass(
      "button-icon",
    );
  });

  test.each([
    ["leading", "button-leading-icon"],
    ["trailing", "button-trailing-icon"],
  ] as const)("iconPosition=%s applies %s", (iconPosition, expectedClass) => {
    render(
      <Button variant="primary" iconPosition={iconPosition}>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      expectedClass,
    );
  });

  test("fullWidth applies button-full", () => {
    render(
      <Button variant="primary" fullWidth>
        Save
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass(
      "button-full",
    );
  });

  test("className passes through alongside typed variant classes", () => {
    render(
      <Button variant="primary" className="my-extra-hook">
        Save
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveClass("button-primary");
    expect(btn).toHaveClass("my-extra-hook");
  });

  test("fullWidth sizes the soft-disabled tooltip wrapper to 100%", () => {
    render(
      <Button
        disabled
        disabledReason="Still needed"
        variant="primary"
        fullWidth
      >
        Save
      </Button>,
    );
    const wrapper = screen.getByRole("button", { name: "Save" }).parentElement;
    expect(wrapper).toHaveStyle({ width: "100%" });
  });
});

describe("Button — as variants", () => {
  test('as="a" renders a plain anchor with no color variant', () => {
    render(
      <Button as="a" href="/terms">
        Terms of Service
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Terms of Service" });
    expect(link).toHaveClass("button");
    expect(link).not.toHaveClass("button-primary");
  });

  test('as="input" applies the typed variant to a submit input', () => {
    render(<Button as="input" variant="secondary" value="Submit" />);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveClass(
      "button-secondary",
    );
  });
});
