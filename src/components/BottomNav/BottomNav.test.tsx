import { render, screen } from "@testing-library/react";
import { useLocation } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("@tanstack/react-router", () => ({
  useLocation: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useLocation).mockReturnValue({ pathname: "/" } as never);
});

describe("BottomNav", () => {
  test("renders prescriptions tab", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /prescriptions/i })).toBeTruthy();
  });

  test("renders fill session tab", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /fill session/i })).toBeTruthy();
  });

  test("renders settings tab", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /settings/i })).toBeTruthy();
  });

  test("marks prescriptions tab active when on /prescriptions", () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/prescriptions",
    } as never);
    render(<BottomNav />);
    expect(
      screen
        .getByRole("link", { name: /prescriptions/i })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  test("marks settings tab active when on /settings", () => {
    vi.mocked(useLocation).mockReturnValue({ pathname: "/settings" } as never);
    render(<BottomNav />);
    expect(
      screen
        .getByRole("link", { name: /settings/i })
        .getAttribute("aria-current"),
    ).toBe("page");
  });

  test("marks prescriptions tab active for child routes", () => {
    vi.mocked(useLocation).mockReturnValue({
      pathname: "/prescriptions/123",
    } as never);
    render(<BottomNav />);
    expect(
      screen
        .getByRole("link", { name: /prescriptions/i })
        .getAttribute("aria-current"),
    ).toBe("page");
  });
});
