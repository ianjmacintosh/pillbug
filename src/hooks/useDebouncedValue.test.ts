import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

const DELAY_MS = 200;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebouncedValue", () => {
  test("starts pending, before any timer advances", () => {
    const { result } = renderHook(() => useDebouncedValue("first", DELAY_MS));

    expect(result.current.isPending).toBe(true);
    expect(result.current.value).toBe("first");
  });

  test("settles to the input value once the delay elapses", () => {
    const { result } = renderHook(() => useDebouncedValue("first", DELAY_MS));

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.value).toBe("first");
  });

  test("collapses rapid changes within the delay window into a single commit of the latest value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY_MS),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "ab" });
    rerender({ value: "abc" });

    expect(result.current.value).toBe("a");

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(result.current.value).toBe("abc");
    expect(result.current.isPending).toBe(false);
  });

  test("re-arms isPending synchronously when the value changes after a settle", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY_MS),
      { initialProps: { value: "a" } },
    );
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    expect(result.current.value).toBe("a");

    rerender({ value: "b" });

    expect(result.current.isPending).toBe(true);
    expect(result.current.value).toBe("a");

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.value).toBe("b");
  });

  test("unmounting while a commit is pending does not warn about state updates on an unmounted component", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = renderHook(() => useDebouncedValue("first", DELAY_MS));
    unmount();

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("changing delayMs mid-flight cancels the old pending commit and re-arms with the new delay", () => {
    const { result, rerender } = renderHook(
      ({ delayMs }) => useDebouncedValue("first", delayMs),
      { initialProps: { delayMs: DELAY_MS } },
    );

    act(() => {
      vi.advanceTimersByTime(DELAY_MS / 2);
    });
    rerender({ delayMs: 500 });

    // The original 200ms window has now fully elapsed, but the commit
    // should not have fired because changing delayMs canceled it.
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    expect(result.current.isPending).toBe(true);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isPending).toBe(false);
    expect(result.current.value).toBe("first");
  });

  test("flush immediately settles a pending value without waiting for the timer", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY_MS),
      { initialProps: { value: "a" } },
    );
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    rerender({ value: "b" });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.flush();
    });

    expect(result.current.isPending).toBe(false);
    expect(result.current.value).toBe("b");
  });

  test("cancel discards the pending update, leaving value and isPending untouched", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, DELAY_MS),
      { initialProps: { value: "a" } },
    );
    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });
    rerender({ value: "b" });
    expect(result.current.isPending).toBe(true);

    act(() => {
      result.current.cancel();
    });

    act(() => {
      vi.advanceTimersByTime(DELAY_MS);
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.value).toBe("a");
  });
});
