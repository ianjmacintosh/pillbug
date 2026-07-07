import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type {
  DrugSearchWorkerRequest,
  DrugSearchWorkerResponse,
} from "./drugNameSearch.worker";
import {
  SUGGESTIONS_DEBOUNCE_MS,
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
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
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
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
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
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
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
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
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
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["metoprolol"]);
  });

  test("keeps showing a settled prefix match while a subsequent typo's search is debounced or in flight", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    // "enalax" no longer prefix-matches anything real — this must not
    // clear the previously-shown "enalapril" while the fuzzy search for
    // the new query is debounced or in flight.
    rerender({ query: "enalax" });
    expect(result.current).toEqual(["enalapril"]);
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
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

  test("discards a stale worker response that arrives after a newer request", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzz" } },
    );
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });

    rerender({ query: "xyzzyw" });
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });

    const worker = instances[0];
    const [firstRequest, secondRequest] = worker.posted.filter(
      (m): m is Extract<DrugSearchWorkerRequest, { type: "search" }> =>
        m.type === "search",
    );
    expect(firstRequest).toBeDefined();
    expect(secondRequest).toBeDefined();

    act(() => {
      worker.respond(secondRequest.requestId, "xyzzyw", ["metoprolol"]);
    });
    expect(result.current).toEqual(["metoprolol"]);

    act(() => {
      // Stale response for a superseded request must not override the
      // newer result that already arrived.
      worker.respond(firstRequest.requestId, "xyzz", ["enalapril"]);
    });
    expect(result.current).toEqual(["metoprolol"]);
  });

  test("a stale worker response cannot clobber a settled prefix match", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "xyzzy" } },
    );
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });
    const worker = instances[0];
    const searchMessage = worker.posted.find((m) => m.type === "search");
    if (searchMessage?.type !== "search") throw new Error("unreachable");

    // The user corrects the typo into a real prefix before the worker
    // responds to the earlier query.
    rerender({ query: "enala" });
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    act(() => {
      worker.respond(searchMessage.requestId, "xyzzy", ["metoprolol"]);
    });
    expect(result.current).toEqual(["enalapril"]);
  });

  test("clears suggestions immediately when the query drops below 2 characters", () => {
    const { result, rerender } = renderHook(
      ({ query }) => useDrugNameSuggestions(query, NAMES),
      { initialProps: { query: "enala" } },
    );
    act(() => {
      vi.advanceTimersByTime(SUGGESTIONS_DEBOUNCE_MS);
    });
    expect(result.current).toEqual(["enalapril"]);

    rerender({ query: "e" });
    expect(result.current).toEqual([]);
  });

  test("terminates the worker on unmount", () => {
    const { unmount } = renderHook(() =>
      useDrugNameSuggestions("xyzzy", NAMES),
    );

    const worker = instances[0];
    unmount();

    expect(worker.terminated).toBe(true);
  });
});
