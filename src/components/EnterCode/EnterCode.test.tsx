import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { useSearch } from "@tanstack/react-router";
import EnterCode from "./EnterCode";

vi.mock("@tanstack/react-router", () => ({
  useSearch: vi.fn(),
}));

describe("EnterCode", () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({ token: "test-token" });
  });

  test("renders a heading", () => {
    render(<EnterCode />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("has a 4-digit code input", () => {
    render(<EnterCode />);
    expect(screen.getByLabelText(/4-digit code/i)).toBeTruthy();
  });

  test("has a verify button", () => {
    render(<EnterCode />);
    expect(screen.getByRole("button", { name: /verify/i })).toBeTruthy();
  });
});

describe("EnterCode error messages", () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({ token: "test-token" });
  });

  async function submitPin(pin: string) {
    await userEvent.type(screen.getByLabelText(/4-digit code/i), pin);
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
  }

  test("shows try-again message when server returns invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 400 }),
    );
    render(<EnterCode />);
    await submitPin("1234");
    expect(await screen.findByText(/incorrect code/i)).toBeTruthy();
  });

  test("shows expired message when server returns expired", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "expired" }), { status: 400 }),
    );
    render(<EnterCode />);
    await submitPin("1234");
    expect(
      await screen.findByText(
        /that login code has expired, please request a new one/i,
      ),
    ).toBeTruthy();
  });

  test("shows used message when server returns used", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "used" }), { status: 400 }),
    );
    render(<EnterCode />);
    await submitPin("1234");
    expect(
      await screen.findByText(/this code has already been used/i),
    ).toBeTruthy();
  });

  test("shows locked message when server returns locked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "locked" }), { status: 400 }),
    );
    render(<EnterCode />);
    await submitPin("1234");
    expect(
      await screen.findByText(/too many incorrect attempts/i),
    ).toBeTruthy();
  });
});

describe("EnterCode auto-submit (pre-filled link)", () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({ token: "test-token", pin: "1234" });
  });

  test("submits token and PIN from URL automatically on mount", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 }),
      );
    render(<EnterCode />);
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/v1/auth/verify-pin",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "test-token", pin: "1234" }),
        }),
      );
    });
  });

  test("redirects to / on successful auto-submit", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const replaceSpy = vi.fn();
    vi.stubGlobal("location", { replace: replaceSpy });
    render(<EnterCode />);
    await waitFor(() => expect(replaceSpy).toHaveBeenCalledWith("/"));
    vi.unstubAllGlobals();
  });

  test("shows expired message when auto-submit returns expired", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "expired" }), { status: 400 }),
    );
    render(<EnterCode />);
    expect(
      await screen.findByText(
        /that login code has expired, please request a new one/i,
      ),
    ).toBeTruthy();
  });

  test("shows invalid message when auto-submit returns invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 400 }),
    );
    render(<EnterCode />);
    expect(await screen.findByText(/incorrect code/i)).toBeTruthy();
  });

  test("shows used message when auto-submit returns used", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "used" }), { status: 400 }),
    );
    render(<EnterCode />);
    expect(
      await screen.findByText(/this code has already been used/i),
    ).toBeTruthy();
  });

  test("shows locked message when auto-submit returns locked", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "locked" }), { status: 400 }),
    );
    render(<EnterCode />);
    expect(
      await screen.findByText(/too many incorrect attempts/i),
    ).toBeTruthy();
  });
});
