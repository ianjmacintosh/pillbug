import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import Login from "./Login";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({
    siteKey,
    onSuccess,
    onError,
    onExpire,
  }: {
    siteKey: string;
    onSuccess: (token: string) => void;
    onError?: () => void;
    onExpire?: () => void;
  }) => (
    <>
      <button data-sitekey={siteKey} onClick={() => onSuccess("dummy-token")}>
        Turnstile
      </button>
      {onError && <button onClick={onError}>Fail security check</button>}
      {onExpire && <button onClick={onExpire}>Expire security check</button>}
    </>
  ),
}));

describe("Login", () => {
  test("renders a heading", () => {
    render(<Login />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("has an email input", () => {
    render(<Login />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  test("has a Turnstile widget", () => {
    render(<Login />);
    expect(screen.getByRole("button", { name: /turnstile/i })).toBeTruthy();
  });

  test("has a submit button", () => {
    render(<Login />);
    expect(
      screen.getByRole("button", { name: /email me a login link/i }),
    ).toBeTruthy();
  });

  test("links to the register page", () => {
    render(<Login />);
    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toBeTruthy();
  });
});

describe("?email query param", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("pre-fills the email input when ?email is present", () => {
    vi.stubGlobal("location", { search: "?email=test%40example.com" });
    render(<Login />);
    const input = screen.getByRole("textbox", {
      name: /email/i,
    }) as HTMLInputElement;
    expect(input.value).toBe("test@example.com");
  });

  test("leaves email empty when ?email is absent", () => {
    render(<Login />);
    const input = screen.getByRole("textbox", {
      name: /email/i,
    }) as HTMLInputElement;
    expect(input.value).toBe("");
  });
});

describe("Turnstile widget callbacks", () => {
  test("shows error message when Turnstile reports an error", async () => {
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: /fail security check/i }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Security check failed. Please reload the page and try again.",
    );
  });

  test("clears the error message when Turnstile subsequently succeeds", async () => {
    render(<Login />);
    fireEvent.click(
      screen.getByRole("button", { name: /fail security check/i }),
    );
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: /^turnstile$/i }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
