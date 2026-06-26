import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18next from "../../utils/i18n";
import Footer from "./Footer";

describe("Footer", () => {
  afterEach(() => vi.restoreAllMocks());

  test("links to the terms page", () => {
    render(<Footer />);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toBeTruthy();
  });

  test("links to the privacy page", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeTruthy();
  });

  test("shows language selector", () => {
    render(<Footer />);
    expect(screen.getByRole("combobox", { name: /language/i })).toBeTruthy();
  });

  test("changing language selector calls i18next.changeLanguage", () => {
    const spy = vi.spyOn(i18next, "changeLanguage");
    render(<Footer />);
    fireEvent.change(screen.getByRole("combobox", { name: /language/i }), {
      target: { value: "pt-BR" },
    });
    expect(spy).toHaveBeenCalledWith("pt-BR");
  });
});
