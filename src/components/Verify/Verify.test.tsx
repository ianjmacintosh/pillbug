import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import Verify from "./Verify";

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => ({ token: "test-token" }),
  useNavigate: () => vi.fn(),
}));

describe("Verify", () => {
  afterEach(() => vi.restoreAllMocks());

  test("shows a loading state while verifying", () => {
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    render(<Verify />);

    expect(screen.getByText(/verifying/i)).toBeTruthy();
  });

  test("does a full page navigation to / when verification succeeds", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const replaceSpy = vi.fn();
    vi.stubGlobal("location", { replace: replaceSpy });

    render(<Verify />);

    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith("/"));
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
