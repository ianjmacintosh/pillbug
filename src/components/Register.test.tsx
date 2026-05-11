import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import Register from "./Register";

vi.mock("@tanstack/react-router", () => ({ useNavigate: () => vi.fn() }));

function fillAndSubmitForm() {
  fireEvent.change(screen.getByRole("textbox", { name: /email/i }), {
    target: { value: "delivered@resend.dev" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: /invite code/i }), {
    target: { value: "code" },
  });
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

  test("shows invite code error message when server returns invalid_invite_code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ error: "invalid_invite_code" }),
      }),
    );
    render(<Register />);

    fillAndSubmitForm();

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Invalid invite code. Please check your invitation and try again.",
    );
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

  test("has an invite code input", () => {
    render(<Register />);
    expect(screen.getByRole("textbox", { name: /invite code/i })).toBeTruthy();
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
