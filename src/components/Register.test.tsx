import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import Register from "./Register";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

describe("Register", () => {
  test("renders a heading", () => {
    render(<Register />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("has an email input", () => {
    render(<Register />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  test("has an invite code input", () => {
    render(<Register />);
    expect(screen.getByRole("textbox", { name: /invite code/i })).toBeTruthy();
  });

  test("has a Terms of Service checkbox", () => {
    render(<Register />);
    expect(screen.getByRole("checkbox", { name: /terms/i })).toBeTruthy();
  });

  test("has a submit button", () => {
    render(<Register />);
    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeTruthy();
  });

  test("links to the login page", () => {
    render(<Register />);
    expect(screen.getByRole("link", { name: /log in/i })).toBeTruthy();
  });
});
