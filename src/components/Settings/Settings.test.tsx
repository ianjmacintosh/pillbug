import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import i18next from "../../lib/i18n";
import Settings from "./Settings";

let mockTimezone: string | null = "America/New_York";
let mockLanguage: string | null = "en-US";
let mockNavigate: ReturnType<typeof vi.fn>;

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    getRouteApi: () => ({
      useLoaderData: () => ({ timezone: mockTimezone, language: mockLanguage }),
    }),
    useNavigate: () => mockNavigate,
  };
});

beforeEach(() => {
  mockTimezone = "America/New_York";
  mockLanguage = "en-US";
  mockNavigate = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe("Settings", () => {
  test("renders a language selector", () => {
    render(<Settings />);
    expect(screen.getByRole("combobox", { name: /language/i })).toBeTruthy();
  });

  test("defaults language select to saved language", () => {
    mockLanguage = "en-US";
    render(<Settings />);
    expect(
      (screen.getByRole("combobox", { name: /language/i }) as HTMLSelectElement)
        .value,
    ).toBe("en-US");
  });

  test("renders a timezone select with options", () => {
    render(<Settings />);
    expect(screen.getByRole("combobox", { name: /time zone/i })).toBeTruthy();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  test("defaults select to saved timezone", () => {
    mockTimezone = "America/Chicago";
    render(<Settings />);
    expect(
      (
        screen.getByRole("combobox", {
          name: /time zone/i,
        }) as HTMLSelectElement
      ).value,
    ).toBe("America/Chicago");
  });

  test("submitting the form includes language in PATCH body", async () => {
    mockLanguage = "en-US";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<Settings />);
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
      expect(body.language).toBe("en-US");
    });
  });

  test("submitting the form calls PATCH /api/v1/account with selected timezone", async () => {
    mockTimezone = "America/New_York";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<Settings />);
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

  test("calls i18next.changeLanguage with selected language on save", async () => {
    mockLanguage = "en-US";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    const spy = vi.spyOn(i18next, "changeLanguage");
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith("en-US");
    });
  });

  test("navigates away after successful save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledOnce();
    });
  });

  test("shows error alert on failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /save/i }));
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy();
    });
  });

  test("does not navigate on failed save", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 500 }),
    );
    render(<Settings />);
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
    render(<Settings />);
    expect(
      (
        screen.getByRole("combobox", {
          name: /time zone/i,
        }) as HTMLSelectElement
      ).value,
    ).toBe("Europe/London");
  });

  test("renders a log out button", () => {
    render(<Settings />);
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
  });

  test("clicking log out calls POST /api/v1/logout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => {
      const calls = vi.mocked(globalThis.fetch).mock.calls;
      const logoutCall = calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url === "/api/v1/logout" &&
          (init as RequestInit)?.method === "POST",
      );
      expect(logoutCall).toBeTruthy();
    });
  });

  test("clicking log out navigates to /register", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 }),
    );
    render(<Settings />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/register" });
    });
  });
});
