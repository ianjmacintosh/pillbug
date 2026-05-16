import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Terms from "./Terms";

describe("Terms", () => {
  test("renders a heading", () => {
    render(<Terms />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
