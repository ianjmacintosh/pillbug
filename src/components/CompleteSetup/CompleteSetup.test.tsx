import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import CompleteSetup from "./CompleteSetup";

let mockNavigate: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({}),
    }),
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockNavigate = vi.fn();
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    locale: "en-US",
    calendar: "gregory",
    hourCycle: "h23",
    numberingSystem: "latn",
    timeZone: "America/Chicago",
  });
});
afterEach(() => vi.restoreAllMocks());

describe("CompleteSetup", () => {
  test("shows loading state while PATCH is in flight", async () => {
    let resolveFetch: (value: Response) => void;
    vi.spyOn(globalThis, "fetch").mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );
    render(<CompleteSetup />);
    expect(screen.getByRole("status")).toBeTruthy();
    resolveFetch!(new Response(null, { status: 200 }));
  });

  test("navigates to / after successful PATCH", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<CompleteSetup />);
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/" });
    });
  });

  test("shows error details from response body when PATCH fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response("Internal Server Error", { status: 500 }),
    );
    render(<CompleteSetup />);
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
    expect(screen.getByText("Internal Server Error")).toBeTruthy();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("retry button triggers a new PATCH attempt", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    render(<CompleteSetup />);
    await waitFor(() => screen.getByRole("button", { name: /retry/i }));
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() => {
      expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(2);
    });
  });

  test("on mount, PATCH body includes language", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<CompleteSetup />);
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
      expect(body.language).toBe("en-US");
    });
  });

  test("on mount, PATCHes browser timezone without user interaction", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<CompleteSetup />);
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
      expect(body.timezone).toBe("America/Chicago");
    });
  });
});
