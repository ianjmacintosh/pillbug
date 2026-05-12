import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import Layout from "./Layout";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
}));

describe("Layout", () => {
  test("renders the site header", () => {
    render(<Layout />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toBeTruthy();
  });

  test("renders a footer with terms and privacy links", () => {
    render(<Layout />);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeTruthy();
  });

  test("renders an outlet for child content", () => {
    render(<Layout />);
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });
});
