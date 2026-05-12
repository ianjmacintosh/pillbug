import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Footer from "./Footer";

describe("Footer", () => {
  test("links to the terms page", () => {
    render(<Footer />);
    expect(
      screen.getByRole("link", { name: /terms of service/i }),
    ).toBeTruthy();
  });

  test("links to the privacy page", () => {
    render(<Footer />);
    expect(screen.getByRole("link", { name: /privacy policy/i })).toBeTruthy();
  });
});
