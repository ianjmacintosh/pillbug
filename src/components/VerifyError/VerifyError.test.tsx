import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import VerifyError from "./VerifyError";

describe("VerifyError", () => {
  test("renders a heading", () => {
    render(<VerifyError />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("explains the link may be expired or already used", () => {
    render(<VerifyError />);
    expect(screen.getByText(/7 days/i)).toBeTruthy();
  });

  test("has a link to /register", () => {
    render(<VerifyError />);
    const link = screen.getByRole("link", { name: /register/i });
    expect(link.getAttribute("href")).toBe("/register");
  });

  test("has a link to /login", () => {
    render(<VerifyError />);
    const link = screen.getByRole("link", { name: /log in/i });
    expect(link.getAttribute("href")).toBe("/login");
  });
});
