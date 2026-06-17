import { describe, expect, test } from "vitest";
import {
  weekBoundaries,
  navigationFloor,
  nearestSunday,
  sessionDates,
} from "./week-boundaries";

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

describe("nearestSunday", () => {
  test("Sunday returns the same date", () => {
    expect(nearestSunday("2024-03-17")).toBe("2024-03-17");
  });

  test("Monday returns the coming Sunday", () => {
    expect(nearestSunday("2024-03-11")).toBe("2024-03-17");
  });

  test("Saturday returns the next day", () => {
    expect(nearestSunday("2024-03-16")).toBe("2024-03-17");
  });
});

describe("sessionDates", () => {
  test("Tuesday start — Sun and Mon wrap to next week", () => {
    const result = sessionDates("2024-03-12"); // Tuesday
    expect(result.sunday).toEqual({ date: "2024-03-17", wrapped: true });
    expect(result.monday).toEqual({ date: "2024-03-18", wrapped: true });
    expect(result.tuesday).toEqual({ date: "2024-03-12", wrapped: false });
    expect(result.wednesday).toEqual({ date: "2024-03-13", wrapped: false });
    expect(result.saturday).toEqual({ date: "2024-03-16", wrapped: false });
  });

  test("Saturday start — six days wrap to next week", () => {
    const result = sessionDates("2024-03-16"); // Saturday
    expect(result.saturday).toEqual({ date: "2024-03-16", wrapped: false });
    expect(result.sunday).toEqual({ date: "2024-03-17", wrapped: true });
    expect(result.monday).toEqual({ date: "2024-03-18", wrapped: true });
    expect(result.friday).toEqual({ date: "2024-03-22", wrapped: true });
  });

  test("year-boundary wrap: Saturday Dec 28 start, Sun–Fri land in Jan", () => {
    const result = sessionDates("2024-12-28"); // Saturday
    expect(result.saturday).toEqual({ date: "2024-12-28", wrapped: false });
    expect(result.sunday).toEqual({ date: "2024-12-29", wrapped: true });
    expect(result.monday).toEqual({ date: "2024-12-30", wrapped: true });
    expect(result.friday).toEqual({ date: "2025-01-03", wrapped: true });
  });

  test("Sunday start — no days wrapped", () => {
    const result = sessionDates("2024-03-17"); // Sunday
    expect(result.sunday).toEqual({ date: "2024-03-17", wrapped: false });
    expect(result.monday).toEqual({ date: "2024-03-18", wrapped: false });
    expect(result.tuesday).toEqual({ date: "2024-03-19", wrapped: false });
    expect(result.wednesday).toEqual({ date: "2024-03-20", wrapped: false });
    expect(result.thursday).toEqual({ date: "2024-03-21", wrapped: false });
    expect(result.friday).toEqual({ date: "2024-03-22", wrapped: false });
    expect(result.saturday).toEqual({ date: "2024-03-23", wrapped: false });
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
