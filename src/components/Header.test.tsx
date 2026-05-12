import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Header from "./Header";

describe("Header", () => {
  test("renders a link to the home page", () => {
    render(<Header />);
    expect(screen.getByRole("link", { name: /pillbug/i })).toBeTruthy();
  });
});
