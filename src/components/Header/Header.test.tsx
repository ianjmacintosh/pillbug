import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Header from "./Header";

describe("Header", () => {
  test("renders a link to the home page", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toBeTruthy();
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

  test("shows home link when authenticated", () => {
    render(<Header isAuthenticated />);
    expect(screen.getByRole("link", { name: /^home$/i })).toBeTruthy();
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
