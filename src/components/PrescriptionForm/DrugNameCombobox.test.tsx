import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { DrugNameCombobox } from "./DrugNameCombobox";
import { DEFAULT_SUGGESTIONS_DEBOUNCE_MS } from "./useDrugNameSuggestions";

const NAMES = ["enalapril", "enoxaparin", "metoprolol"];

// Waits out the real debounce timer inside act() so React (and any
// third-party effects, e.g. Ariakit's active-item wiring) fully flushes the
// resulting state update before the test continues.
async function waitOutDebounce(debounceMs = DEFAULT_SUGGESTIONS_DEBOUNCE_MS) {
  await act(
    () => new Promise((resolve) => setTimeout(resolve, debounceMs + 50)),
  );
}

describe("DrugNameCombobox", () => {
  test("typing calls onChange with the typed value", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DrugNameCombobox
        id="drugName"
        value=""
        onChange={onChange}
        names={NAMES}
      />,
    );

    await user.type(screen.getByRole("combobox"), "e");

    expect(onChange).toHaveBeenLastCalledWith("e");
  });

  test("shows matching suggestions in display case once typing pauses", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
        />
      );
    }
    render(<Wrapper />);

    await user.type(screen.getByRole("combobox"), "enala");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    await waitOutDebounce();

    expect(
      screen.getByRole("option", { name: "Enalapril" }),
    ).toBeInTheDocument();
  });

  test("selecting a suggestion sets the display-cased value and closes the popover", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
        />
      );
    }
    render(<Wrapper />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "enala");
    await waitOutDebounce();
    await user.click(screen.getByRole("option", { name: "Enalapril" }));

    expect(input.value).toBe("Enalapril");
    await waitFor(() =>
      expect(screen.queryByRole("option")).not.toBeInTheDocument(),
    );
  });

  test("selecting a suggestion does not reopen the popover afterward", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
        />
      );
    }
    render(<Wrapper />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "enala");
    // Keyboard navigation needs an extra beat beyond the debounce settling:
    // Ariakit wires up aria-activedescendant asynchronously after the
    // popover's first mount (floating-ui positioning), and ArrowDown before
    // that has settled is a no-op in jsdom.
    await waitOutDebounce();
    await waitOutDebounce();
    await user.keyboard("{ArrowDown}{Enter}");

    expect(input.value).toBe("Enalapril");
    await waitFor(() =>
      expect(screen.queryByRole("option")).not.toBeInTheDocument(),
    );
  });

  test("allows free text with no matches in the bundled list", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
        />
      );
    }
    render(<Wrapper />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "xyzzy");
    await waitOutDebounce();

    expect(input.value).toBe("xyzzy");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  test("passes the required attribute through to the input", () => {
    const onChange = vi.fn();
    render(
      <DrugNameCombobox
        id="drugName"
        value=""
        onChange={onChange}
        names={NAMES}
        required
      />,
    );

    expect(screen.getByRole("combobox")).toBeRequired();
  });

  test("autocompleteSettings.minChars raises how many characters are needed before a suggestion appears", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
          autocompleteSettings={{ minChars: 6 }}
        />
      );
    }
    render(<Wrapper />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    // "enala" is 5 characters — a real prefix that would normally resolve
    // under the default minChars (3), but not under this custom, higher one.
    await user.type(input, "enala");
    await waitOutDebounce();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    await user.type(input, "p");
    await waitOutDebounce();
    expect(
      screen.getByRole("option", { name: "Enalapril" }),
    ).toBeInTheDocument();
  });

  test("autocompleteSettings.debounceMs changes how long typing must pause before a suggestion appears", async () => {
    const user = userEvent.setup();
    const customDebounceMs = DEFAULT_SUGGESTIONS_DEBOUNCE_MS * 3;
    function Wrapper() {
      const [value, setValue] = useState("");
      return (
        <DrugNameCombobox
          id="drugName"
          value={value}
          onChange={setValue}
          names={NAMES}
          autocompleteSettings={{ debounceMs: customDebounceMs }}
        />
      );
    }
    render(<Wrapper />);

    const input = screen.getByRole("combobox") as HTMLInputElement;
    await user.type(input, "enala");

    // The default debounce would have already fired by now.
    await waitOutDebounce();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    // The custom, longer debounce has now had time to settle.
    await waitOutDebounce(customDebounceMs);
    expect(
      screen.getByRole("option", { name: "Enalapril" }),
    ).toBeInTheDocument();
  });
});
