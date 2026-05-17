import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CheckYourEmail from "./CheckYourEmail";

describe("CheckYourEmail", () => {
  test("renders a heading", () => {
    render(<CheckYourEmail />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });

  test("tells the user to expect an email", () => {
    render(<CheckYourEmail />);
    expect(screen.getByText(/emailed you/i)).toBeTruthy();
  });
});
