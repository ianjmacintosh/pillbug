import { render, screen, waitFor } from "@testing-library/react";
import { afterEach } from "vitest";
import { describe, expect, test, vi } from "vitest";
import Verify from "./Verify";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({
  useSearch: () => ({ token: "test-token" }),
  useNavigate: () => mockNavigate,
}));

describe("Verify", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows a loading state while verifying", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<Verify />);

    expect(screen.getByText(/verifying/i)).toBeTruthy();
  });

  test("navigates to / when verification succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );

    render(<Verify />);

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: "/" }));
  });

  test("shows error content when verification fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 400 }),
    );

    render(<Verify />);

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: /invalid or expired/i }),
      ).toBeTruthy(),
    );
  });
});
