import { render, screen } from "@testing-library/react";
import { useLocation } from "@tanstack/react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";
import BottomNav from "./BottomNav";

vi.mock("@tanstack/react-router", () => ({
  useLocation: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(useLocation).mockReturnValue({
    pathname: "/some-unrelated-route",
  } as never);
});

describe("BottomNav", () => {
  describe("tab rendering", () => {
    test("renders prescriptions tab linking to /prescriptions", () => {
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /prescriptions/i }),
      ).toHaveAttribute("href", "/prescriptions");
    });

    test("renders fill session tab linking to /fill-session", () => {
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /fill session/i }),
      ).toHaveAttribute("href", "/fill-session");
    });

    test("renders settings tab linking to /settings", () => {
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
        "href",
        "/settings",
      );
    });
  });

  describe("active state", () => {
    test("no tab is active on an unrelated route", () => {
      render(<BottomNav />);
      expect(screen.queryByRole("link", { current: "page" })).toBeNull();
    });

    test("prescriptions tab is active on /prescriptions", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/prescriptions",
      } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /prescriptions/i }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("prescriptions tab is active on child routes", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/prescriptions/123",
      } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /prescriptions/i }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("fill session tab is active on /fill-session", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/fill-session",
      } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /fill session/i }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("fill session tab is active on child step routes", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/fill-session/step2",
      } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /fill session/i }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("fill session tab is active on / (the Home Screen)", () => {
      vi.mocked(useLocation).mockReturnValue({ pathname: "/" } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /fill session/i }),
      ).toHaveAttribute("aria-current", "page");
    });

    test("settings tab is active on /settings", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/settings",
      } as never);
      render(<BottomNav />);
      expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });

    test("only the matching tab is active", () => {
      vi.mocked(useLocation).mockReturnValue({
        pathname: "/settings",
      } as never);
      render(<BottomNav />);
      expect(
        screen.getByRole("link", { name: /prescriptions/i }),
      ).not.toHaveAttribute("aria-current");
      expect(
        screen.getByRole("link", { name: /fill session/i }),
      ).not.toHaveAttribute("aria-current");
      expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
        "aria-current",
        "page",
      );
    });
  });
});
