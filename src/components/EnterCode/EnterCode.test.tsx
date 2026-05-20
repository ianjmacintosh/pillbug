import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import EnterCode from "./EnterCode";

vi.mock("@tanstack/react-router", () => ({
  useSearch: () => ({ token: "test-token" }),
}));

describe("EnterCode", () => {
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
  async function submitPin(pin: string) {
    await userEvent.type(screen.getByLabelText(/4-digit code/i), pin);
    await userEvent.click(screen.getByRole("button", { name: /verify/i }));
  }

  test("shows expired message when server returns invalid", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid" }), { status: 400 }),
    );
    render(<EnterCode />);
    await submitPin("1234");
    expect(
      await screen.findByText(
        /that login code has expired, please request a new one/i,
      ),
    ).toBeTruthy();
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
