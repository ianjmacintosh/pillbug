import { describe, expect, test } from "vitest";
import { weekBoundaries, navigationFloor } from "./week-boundaries";

describe("weekBoundaries", () => {
  test("returns Monday and Sunday for a mid-week date", () => {
    expect(weekBoundaries("2024-03-13")).toEqual({
      monday: "2024-03-11",
      sunday: "2024-03-17",
    });
  });

  test("returns the same Monday when given a Monday", () => {
    expect(weekBoundaries("2024-03-11")).toEqual({
      monday: "2024-03-11",
      sunday: "2024-03-17",
    });
  });

  test("returns the same Sunday when given a Sunday", () => {
    expect(weekBoundaries("2024-03-17")).toEqual({
      monday: "2024-03-11",
      sunday: "2024-03-17",
    });
  });

  test("handles a year-boundary week", () => {
    expect(weekBoundaries("2025-01-01")).toEqual({
      monday: "2024-12-30",
      sunday: "2025-01-05",
    });
  });
});

describe("navigationFloor", () => {
  test("registration on a Monday returns that same Monday", () => {
    expect(navigationFloor("2024-03-11")).toBe("2024-03-11");
  });

  test("registration on a Sunday returns the Monday of that week", () => {
    expect(navigationFloor("2024-03-17")).toBe("2024-03-11");
  });

  test("registration mid-week returns the Monday of that week", () => {
    expect(navigationFloor("2024-03-13")).toBe("2024-03-11");
  });
});
