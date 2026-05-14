import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Privacy from "./Privacy";

describe("Privacy", () => {
  test("renders a heading", () => {
    render(<Privacy />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
