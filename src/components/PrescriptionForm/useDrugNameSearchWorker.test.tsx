import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  DrugSearchWorkerRequest,
  DrugSearchWorkerResponse,
} from "./drugNameSearch.worker";
import { useDrugNameSearchWorker } from "./useDrugNameSearchWorker";

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
});

const NAMES = ["enalapril", "enoxaparin", "metoprolol"];

describe("useDrugNameSearchWorker", () => {
  test("result starts null before any search() call", () => {
    const { result } = renderHook(() => useDrugNameSearchWorker(NAMES));

    expect(result.current.result).toBeNull();
  });

  test("search(query) posts a search message to the worker", () => {
    const { result } = renderHook(() => useDrugNameSearchWorker(NAMES));

    act(() => {
      result.current.search("xyzzy");
    });

    const worker = instances[0];
    const searchMessages = worker.posted.filter((m) => m.type === "search");
    expect(searchMessages).toHaveLength(1);
    expect(searchMessages[0]).toMatchObject({ query: "xyzzy" });
  });

  test("result reflects the worker's response, tagged with the query it answered", () => {
    const { result } = renderHook(() => useDrugNameSearchWorker(NAMES));

    act(() => {
      result.current.search("xyzzy");
    });
    const worker = instances[0];
    const searchMessage = worker.posted.find((m) => m.type === "search");
    if (searchMessage?.type !== "search") throw new Error("unreachable");

    act(() => {
      worker.respond(searchMessage.requestId, "xyzzy", ["metoprolol"]);
    });

    expect(result.current.result).toEqual({
      query: "xyzzy",
      results: ["metoprolol"],
    });
  });

  test("posts setNames whenever the names reference changes", () => {
    const { rerender } = renderHook(
      ({ names }) => useDrugNameSearchWorker(names),
      { initialProps: { names: NAMES } },
    );

    const newNames = [...NAMES, "dorzolamide"];
    rerender({ names: newNames });

    const worker = instances[0];
    const setNamesMessages = worker.posted.filter((m) => m.type === "setNames");
    // One on mount (with the initial names) and one for the change.
    expect(setNamesMessages).toHaveLength(2);
    expect(setNamesMessages[1]).toMatchObject({ names: newNames });
  });

  test("a response for a superseded request is discarded", () => {
    const { result } = renderHook(() => useDrugNameSearchWorker(NAMES));

    act(() => {
      result.current.search("xyzz");
    });
    act(() => {
      result.current.search("xyzzy");
    });

    const worker = instances[0];
    const [firstRequest, secondRequest] = worker.posted.filter(
      (m): m is Extract<DrugSearchWorkerRequest, { type: "search" }> =>
        m.type === "search",
    );

    act(() => {
      worker.respond(secondRequest.requestId, "xyzzy", ["metoprolol"]);
    });
    expect(result.current.result).toEqual({
      query: "xyzzy",
      results: ["metoprolol"],
    });

    act(() => {
      // Stale response for a superseded request must not override the
      // newer result that already arrived.
      worker.respond(firstRequest.requestId, "xyzz", ["enalapril"]);
    });
    expect(result.current.result).toEqual({
      query: "xyzzy",
      results: ["metoprolol"],
    });
  });

  test("creates the worker on mount, terminates it on unmount", () => {
    const { unmount } = renderHook(() => useDrugNameSearchWorker(NAMES));

    const worker = instances[0];
    expect(worker.terminated).toBe(false);

    unmount();

    expect(worker.terminated).toBe(true);
  });
});
