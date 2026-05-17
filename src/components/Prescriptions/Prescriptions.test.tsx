import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import Prescriptions from "./Prescriptions";

describe("Prescriptions", () => {
  test("renders a heading", () => {
    render(<Prescriptions />);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
  });
});
