import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Login from "./Login";

describe("Login", () => {
  test("renders a heading", () => {
    render(<Login />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("has an email input", () => {
    render(<Login />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  test("has a submit button", () => {
    render(<Login />);
    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeTruthy();
  });

  test("links to the register page", () => {
    render(<Login />);
    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toBeTruthy();
  });
});
