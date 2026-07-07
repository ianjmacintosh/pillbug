import { useEffect, useRef, useState } from "react";
import { createDrugNameWorker } from "./drugNameWorkerClient";
import type { DrugSearchWorkerResponse } from "./drugNameSearch.worker";
import { getPrefixMatches } from "./PrescriptionForm.helpers";

// Wait for the user to pause before reacting to a new query at all — for
// both the instant prefix-match path and the fuzzy worker fallback. Without
// this, suggestions would open and update on every keystroke while the user
// is still mid-word.
export const SUGGESTIONS_DEBOUNCE_MS = 200;

// Full-corpus fuzzy search over ~14k drug names is too slow to run
// synchronously on the main thread (100-500ms+ per keystroke on a throttled
// device), so the fuzzy fallback runs in a worker.
export function useDrugNameSuggestions(
  query: string,
  names: readonly string[],
): string[] {
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    const worker = createDrugNameWorker();
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<DrugSearchWorkerResponse>) => {
      // Discard responses superseded by a later settled query.
      if (event.data.requestId === requestIdRef.current) {
        setSuggestions(event.data.results);
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

  useEffect(() => {
    if (query.length < 2) {
      requestIdRef.current += 1; // invalidate any in-flight search
      return;
    }

    const timer = setTimeout(() => {
      // Bump on every settled query (not just worker dispatches) so a
      // worker response from an earlier settle can't clobber a suggestion
      // list this settle resolved via the cheap prefix path instead.
      requestIdRef.current += 1;
      const prefixMatches = getPrefixMatches(query, names);
      if (prefixMatches.length > 0) {
        setSuggestions(prefixMatches);
        return;
      }
      // No valid prefix — fall back to the fuzzy worker search. Keep
      // showing whatever was already displayed until the response
      // arrives, rather than clearing to empty (which would flicker the
      // popover closed and reopened).
      workerRef.current?.postMessage({
        type: "search",
        requestId: requestIdRef.current,
        query,
      });
    }, SUGGESTIONS_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, names]);

  // A too-short query never has suggestions, regardless of what's still in
  // state from a prior (now-abandoned) settle — no need to route this
  // derived case through a state update.
  return query.length < 2 ? [] : suggestions;
}
