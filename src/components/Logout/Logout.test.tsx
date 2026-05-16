import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import Logout from "./Logout";

const mockNavigate = vi.fn();
vi.mock("@tanstack/react-router", () => ({ useNavigate: () => mockNavigate }));

describe("Logout", () => {
  test("renders a heading", () => {
    render(<Logout />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("shows confirmation text", () => {
    render(<Logout />);
    expect(screen.getByText(/you're logged in/i)).toBeTruthy();
  });

  test("has a Log out button", () => {
    render(<Logout />);
    expect(screen.getByRole("button", { name: /log out/i })).toBeTruthy();
  });

  test("clicking Log out calls POST /api/v1/logout", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 302 }));

    render(<Logout />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(fetchSpy).toHaveBeenCalledWith("/api/v1/logout", {
      method: "POST",
    });
  });

  test("navigates to /register after logout", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(null, { status: 302 }),
    );

    render(<Logout />);
    await userEvent.click(screen.getByRole("button", { name: /log out/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/register" });
  });
});
