import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CheckYourEmail from "./CheckYourEmail";

describe("CheckYourEmail", () => {
  test("renders a heading", () => {
    render(<CheckYourEmail />);
    expect(
      screen.getByRole("heading", { name: /check your email/i }),
    ).toBeTruthy();
  });

  test("tells the user to expect a magic link", () => {
    render(<CheckYourEmail />);
    expect(screen.getByText(/magic link/i)).toBeTruthy();
  });
});
