import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import FillSession from "./FillSession";

describe("FillSession", () => {
  test("renders a heading", () => {
    render(<FillSession />);
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});
