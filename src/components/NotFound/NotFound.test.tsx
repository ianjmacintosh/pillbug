import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import NotFound from "./NotFound";

describe("NotFound", () => {
  test("renders a not found message", () => {
    render(<NotFound />);
    expect(screen.getByRole("heading", { name: /not found/i })).toBeTruthy();
  });
});
