import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import Layout from "./Layout";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-testid="outlet" />,
  useLocation: vi.fn(() => ({ pathname: "/" })),
  Link: ({
    to,
    children,
    className,
  }: {
    to: string;
    children: ReactNode;
    className?: string;
  }) => (
    <a href={to} className={className}>
      {children}
    </a>
  ),
}));

afterEach(() => vi.unstubAllGlobals());

describe("Layout", () => {
  test("renders the site header", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<Layout />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toBeTruthy();
  });

  test("renders a footer with terms and privacy links", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<Layout />);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeTruthy();
  });

  test("renders an outlet for child content", () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<Layout />);
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  test("shows bottom nav after session check succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<Layout />);
    expect(
      await screen.findByRole("navigation", { name: /main navigation/i }),
    ).toBeTruthy();
  });

  test("hides authenticated nav when session check fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    render(<Layout />);
    expect(screen.queryByRole("link", { name: /settings/i })).toBeNull();
  });

  test("hides the footer after session check succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
    render(<Layout />);
    await screen.findByRole("navigation", { name: /main navigation/i });
    expect(
      screen.queryByRole("link", { name: /terms of service/i }),
    ).toBeNull();
    expect(screen.queryByRole("link", { name: /privacy policy/i })).toBeNull();
  });
});
