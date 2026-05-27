import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CompleteSetup from "./CompleteSetup";

let mockTimezone: string | null = "America/New_York";
let mockNavigate: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({ timezone: mockTimezone }),
    }),
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockTimezone = "America/New_York";
  mockNavigate = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("CompleteSetup", () => {
  test("renders a timezone select with options", () => {
    render(<CompleteSetup />);
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  test("renders onboarding messaging explaining why timezone is required", () => {
    render(<CompleteSetup />);
    expect(screen.getByText(/time zone/i, { selector: "p" })).toBeTruthy();
  });

  test("defaults select to saved timezone", () => {
    mockTimezone = "America/Chicago";
    render(<CompleteSetup />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "America/Chicago",
    );
  });

  test("submitting the form calls PATCH /api/v1/account with selected timezone", async () => {
    mockTimezone = "America/New_York";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<CompleteSetup />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const patchCall = calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url === "/api/v1/account" &&
          (init as RequestInit)?.method === "PATCH",
      );
      expect(patchCall).toBeTruthy();
      const body = JSON.parse((patchCall![1] as RequestInit).body as string);
      expect(body.timezone).toBe("America/New_York");
    });
  });

  test("navigates to / after successful save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<CompleteSetup />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  test("shows error alert on failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    render(<CompleteSetup />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  test("does not navigate on failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    render(<CompleteSetup />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => screen.getByRole("alert"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("falls back to browser timezone when saved timezone is null", () => {
    mockTimezone = null;
    vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
      locale: "en-US",
      calendar: "gregory",
      hourCycle: "h23",
      numberingSystem: "latn",
      timeZone: "Europe/London",
    });
    render(<CompleteSetup />);
    expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe(
      "Europe/London",
    );
  });
});
