import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Settings from "./Settings";

describe("Settings", () => {
  test("renders a heading", () => {
    render(<Settings />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
