import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import Register from "./Register";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@marsidev/react-turnstile", () => ({
  Turnstile: ({ onSuccess }: { onSuccess: (token: string) => void }) => (
    <button onClick={() => onSuccess("dummy-token")}>Turnstile</button>
  ),
}));

function fillAndSubmitForm() {
  fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
    target: { value: "delivered@resend.dev" },
  });
  fireEvent.click(screen.getByRole("button", { name: /turnstile/i }));
  fireEvent.click(screen.getByRole("checkbox", { name: /terms/i }));
  fireEvent.submit(screen.getByRole("button", { name: /send magic link/i }));
}

describe("Register form submission", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("shows generic error message when server returns internal_error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "internal_error" }),
      }),
    );
    render(<Register />);

    fillAndSubmitForm();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong. Please try again.");
  });

  test("shows generic error message when server returns invalid_turnstile_token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_turnstile_token" }),
      }),
    );
    render(<Register />);

    fillAndSubmitForm();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Something went wrong. Please try again.");
  });
});

describe("Register", () => {
  test("renders a heading", () => {
    render(<Register />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("has an email input", () => {
    render(<Register />);
    expect(screen.getByRole("textbox", { name: /email/i })).toBeTruthy();
  });

  test("has no invite code input", () => {
    render(<Register />);
    expect(screen.queryByRole("textbox", { name: /invite code/i })).toBeNull();
  });

  test("has a Turnstile widget", () => {
    render(<Register />);
    expect(screen.getByRole("button", { name: /turnstile/i })).toBeTruthy();
  });

  test("has a Terms of Service checkbox", () => {
    render(<Register />);
    expect(screen.getByRole("checkbox", { name: /terms/i })).toBeTruthy();
  });

  test("has a submit button", () => {
    render(<Register />);
    expect(
      screen.getByRole("button", { name: /send magic link/i }),
    ).toBeTruthy();
  });

  test("links to the login page", () => {
    render(<Register />);
    expect(screen.getByRole("link", { name: /log in/i })).toBeTruthy();
  });
});
