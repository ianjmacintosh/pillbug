import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18next from "../../utils/i18n";
import Header from "./Header";

describe("Header", () => {
  afterEach(() => vi.restoreAllMocks());

  test("brand link points to /prescriptions", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toHaveAttribute(
      "href",
      "/prescriptions",
    );
  });

  test("shows language selector when not authenticated", () => {
    render(<Header />);
    expect(screen.getByRole("combobox", { name: /language/i })).toBeTruthy();
  });

  test("does not show language selector when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.queryByRole("combobox", { name: /language/i })).toBeNull();
  });

  test("language selector includes English (US) option", () => {
    render(<Header />);
    expect(screen.getByRole("option", { name: "English (US)" })).toBeTruthy();
  });

  test("changing language selector calls i18next.changeLanguage", () => {
    const spy = vi.spyOn(i18next, "changeLanguage");
    render(<Header />);
    fireEvent.change(screen.getByRole("combobox", { name: /language/i }), {
      target: { value: "en-US" },
    });
    expect(spy).toHaveBeenCalledWith("en-US");
  });

  test("does not show settings or logout when not authenticated", () => {
    render(<Header />);
    expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /log out/i })).toBeNull();
  });

  test("shows settings link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.getByRole("link", { name: /settings/i })).toBeTruthy();
  });

  test("does not show home link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.queryByRole("link", { name: /^home$/i })).toBeNull();
  });

  test("shows prescriptions link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.getByRole("link", { name: /prescriptions/i })).toBeTruthy();
  });

  test("shows fill session link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.getByRole("link", { name: /fill session/i })).toBeTruthy();
  });

  test("shows logout button when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
  });
});
