import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
  DrugSearchWorkerRequest,
  DrugSearchWorkerResponse,
} from "./drugNameSearch.worker";
import {
  DEFAULT_MIN_CHARS,
  DEFAULT_SUGGESTIONS_DEBOUNCE_MS,
  useDrugNameSuggestions,
} from "./useDrugNameSuggestions";

const { FakeWorker, instances } = vi.hoisted(() => {
  const instances: InstanceType<typeof FakeWorker>[] = [];

  class FakeWorker {
    onmessage:
      | ((event: MessageEvent<DrugSearchWorkerResponse>) => void)
      | null = null;
    posted: DrugSearchWorkerRequest[] = [];
    terminated = false;

    constructor() {
      instances.push(this);
    }

    postMessage(message: DrugSearchWorkerRequest) {
      this.posted.push(message);
    }

    terminate() {
      this.terminated = true;
    }

    respond(requestId: number, query: string, results: string[]) {
      this.onmessage?.({
        data: { requestId, query, results },
      } as MessageEvent<DrugSearchWorkerResponse>);
    }
  }

  return { FakeWorker, instances };
});

vi.mock("./drugNameWorkerClient", () => ({
  createDrugNameWorker: () => new FakeWorker(),
}));

beforeEach(() => {
  instances.length = 0;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const NAMES = ["enalapril", "enoxaparin", "metoprolol"];

describe("useDrugNameSuggestions", () => {
  test("shows nothing until typing pauses, even for a valid prefix", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );

    expect(result.current).toEqual([]);
    const worker = instances[0];
    expect(worker.posted.some((m) => m.type === "search")).toBe(false);
  });

  test("resolves a matching prefix once typing pauses, without contacting the worker", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    expect(result.current).toEqual(["enalapril"]);
    const worker = instances[0];
    expect(worker.posted.some((m) => m.type === "search")).toBe(false);
  });

  test("does not contact the worker until typing pauses for the debounce interval", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzz" } },
    );
    rerender({ query: "xyzzy" });

    const worker = instances[0];
    expect(worker.posted.some((m) => m.type === "search")).toBe(false);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    // The pause-then-fire debounce collapses the fast "xyzz" -> "xyzzy" run
    // into a single request for the latest query, not one per keystroke.
    const searchMessages = worker.posted.filter((m) => m.type === "search");
    expect(searchMessages).toHaveLength(1);
    expect(searchMessages[0]).toMatchObject({ query: "xyzzy" });

    expect(result.current).toEqual([]);
  });

  test("falls back to the worker when there is no prefix match, and applies its response", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzzy" } },
    );

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    const worker = instances[0];
    const searchMessage = worker.posted.find((m) => m.type === "search");
    expect(searchMessage).toBeDefined();
    if (searchMessage?.type !== "search") throw new Error("unreachable");

    act(() => {
      worker.respond(searchMessage.requestId, "xyzzy", ["metoprolol"]);
    });

    expect(result.current).toEqual(["metoprolol"]);
  });

  test("keeps showing the previous suggestions while a new search is debounced or in flight", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzzy" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    const worker = instances[0];
    const firstRequest = worker.posted.find((m) => m.type === "search");
    if (firstRequest?.type !== "search") throw new Error("unreachable");
    act(() => {
      worker.respond(firstRequest.requestId, "xyzzy", ["metoprolol"]);
    });
    expect(result.current).toEqual(["metoprolol"]);

    // A further keystroke (still no prefix match) must not clear the
    // popover to empty while the next search is debounced/in flight — that
    // gap is what reads as the popover closing and reopening.
    rerender({ query: "xyzzyz" });
    expect(result.current).toEqual(["metoprolol"]);
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["metoprolol"]);
  });

  test("keeps showing a settled prefix match while a subsequent typo's search is debounced or in flight", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    // "enalax" no longer prefix-matches anything real — this must not
    // clear the previously-shown "enalapril" while the fuzzy search for
    // the new query is debounced or in flight.
    rerender({ query: "enalax" });
    expect(result.current).toEqual(["enalapril"]);
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    const worker = instances[0];
    const searchMessage = worker.posted.find((m) => m.type === "search");
    if (searchMessage?.type !== "search") throw new Error("unreachable");
    act(() => {
      worker.respond(searchMessage.requestId, "enalax", ["enoxaparin"]);
    });
    expect(result.current).toEqual(["enoxaparin"]);
  });

  test("a stale worker response cannot clobber a settled prefix match", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzzy" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    const worker = instances[0];
    const searchMessage = worker.posted.find((m) => m.type === "search");
    if (searchMessage?.type !== "search") throw new Error("unreachable");

    // The user corrects the typo into a real prefix before the worker
    // responds to the earlier query.
    rerender({ query: "enala" });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    act(() => {
      worker.respond(searchMessage.requestId, "xyzzy", ["metoprolol"]);
    });
    expect(result.current).toEqual(["enalapril"]);
  });

  test("clears suggestions immediately when the query drops below the minimum length", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    rerender({ query: "e" });
    expect(result.current).toEqual([]);
  });

  test("does not show a prefix match shorter than a custom minChars setting", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES, { minChars: 4 }),
      { initialProps: { query: "ena" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    // "ena" is a valid 3-char prefix of "enalapril" and would normally
    // resolve under the default minChars (3) — a custom, higher minChars
    // must suppress it.
    expect(result.current).toEqual([]);
    const worker = instances[0];
    expect(worker.posted.some((m) => m.type === "search")).toBe(false);
  });

  test("shows a prefix match once a custom minChars setting is reached", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES, { minChars: 4 }),
      { initialProps: { query: "enal" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    expect(result.current).toEqual(["enalapril"]);
  });

  test("respects a custom debounceMs setting, waiting longer than the default before reacting", () => {
    const customDebounceMs = DEFAULT_SUGGESTIONS_DEBOUNCE_MS * 3;
    const { result } = renderHook(
      ({ query }) =>
        useDrugNameSuggestions(query, NAMES, {
          debounceMs: customDebounceMs,
        }),
      { initialProps: { query: "enala" } },
    );

    // The default debounce would have already fired by now — a custom,
    // longer one must not have settled yet.
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(
        customDebounceMs - DEFAULT_SUGGESTIONS_DEBOUNCE_MS,
      );
    });
    expect(result.current).toEqual(["enalapril"]);
  });

  test("falls back to DEFAULT_MIN_CHARS and DEFAULT_SUGGESTIONS_DEBOUNCE_MS when no settings are passed", () => {
    const { result } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "en" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });

    // "en" is shorter than DEFAULT_MIN_CHARS (3) — confirms the default is
    // actually applied, not just documented.
    expect(DEFAULT_MIN_CHARS).toBe(3);
    expect(result.current).toEqual([]);
  });

  test("forgets a settled answer once cleared, so a later unrelated search never shows it — even after a long pause first", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    // Clear the field and let the debounce fully settle on the empty
    // value before typing again — this is the exact repro: a real pause,
    // not a fast retype.
    rerender({ query: "" });
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS * 10);
    });
    expect(result.current).toEqual([]);

    // Type a completely unrelated query. Before the fix, the stale
    // "enalapril" answer — never actually cleared, only hidden while the
    // query was too short — would reappear the instant enough characters
    // were typed, even before this new search has resolved.
    rerender({ query: "meto" });
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["metoprolol"]);
  });

  test("forgets a settled answer immediately on clear, even when retyping starts before the debounce would have settled", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    // Clear, then immediately start typing a new query — never letting the
    // debounce settle on the short/empty intermediate value at all. The
    // reset must still have fired synchronously on the clearing keystroke
    // itself for this to work.
    rerender({ query: "" });
    rerender({ query: "meto" });
    expect(result.current).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(DEFAULT_SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["metoprolol"]);
  });
});
