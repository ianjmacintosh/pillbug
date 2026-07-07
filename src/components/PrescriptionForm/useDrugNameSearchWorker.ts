import { useCallback, useEffect, useRef, useState } from "react";
import { createDrugNameWorker } from "./drugNameWorkerClient";
import type { DrugSearchWorkerResponse } from "./drugNameSearch.worker";

export interface DrugNameSearchWorkerResult {
  query: string;
  results: string[];
}

export interface DrugNameSearchWorker {
  search: (query: string) => void;
  result: DrugNameSearchWorkerResult | null;
}

// Owns only the worker RPC lifecycle: creating/terminating the worker,
// keeping it in sync with `names`, and correlating responses to the
// request that triggered them so a stale response can't be applied.
export function useDrugNameSearchWorker(
  names: readonly string[],
): DrugNameSearchWorker {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [result, setResult] = useState<DrugNameSearchWorkerResult | null>(null);

  useEffect(() => {
    const worker = createDrugNameWorker();
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<DrugSearchWorkerResponse>) => {
      if (event.data.requestId === requestIdRef.current) {
        setResult({ query: event.data.query, results: event.data.results });
      }
    };
    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    workerRef.current?.postMessage({ type: "setNames", names });
  }, [names]);

  const search = useCallback((query: string) => {
    requestIdRef.current += 1;
    workerRef.current?.postMessage({
      type: "search",
      requestId: requestIdRef.current,
      query,
    });
  }, []);

  return { search, result };
}
