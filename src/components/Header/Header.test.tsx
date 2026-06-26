import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import i18next from "../../utils/i18n";
import Header from "./Header";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

describe("Header", () => {
  afterEach(() => vi.restoreAllMocks());

  test("brand link points to /prescriptions", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toHaveAttribute(
      "href",
      "/prescriptions",
    );
  });

  test("does not show language selector", () => {
    render(<Header />);
    expect(screen.queryByRole("combobox", { name: /language/i })).toBeNull();
  });

  test("shows log in link when not authenticated", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /log in/i })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  test("does not show log in link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.queryByRole("link", { name: /log in/i })).toBeNull();
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
