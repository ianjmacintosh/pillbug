import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDrugNameSearchWorker } from "./useDrugNameSearchWorker";
import { getPrefixMatches } from "./PrescriptionForm.helpers";

// Wait for the user to pause before reacting to a new query at all — for
// both the instant prefix-match path and the fuzzy worker fallback. Without
// this, suggestions would open and update on every keystroke while the user
// is still mid-word.
export const SUGGESTIONS_DEBOUNCE_MS = 200;

// A full-corpus fuzzy scan blocks the main thread for noticeably long on a
// throttled device, so the fuzzy fallback runs in a worker rather than
// synchronously in this hook.
export function useDrugNameSuggestions(
  query: string,
  names: readonly string[],
): string[] {
  const { value: debouncedQuery, isPending } = useDebouncedValue(
    query,
    SUGGESTIONS_DEBOUNCE_MS,
  );
  const { search, result } = useDrugNameSearchWorker(names);

  const prefixMatches = useMemo(
    () =>
      isPending || debouncedQuery.length < 2
        ? []
        : getPrefixMatches(debouncedQuery, names),
    [isPending, debouncedQuery, names],
  );

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [appliedQuery, setAppliedQuery] = useState<string | null>(null);

  // Once the query settles, adjust `suggestions` synchronously during
  // render — rather than in an effect — whenever a new answer becomes
  // available for it: either the cheap prefix scan, or a worker response
  // that answers this exact query. This is a pure derivation from
  // `debouncedQuery`/`names`/`result`, not a synchronization with an
  // external system (see "Adjusting state when a prop changes" in the
  // React docs). Leaving `suggestions` untouched when neither is ready yet
  // is what keeps the previous list visible while the next one is
  // debounced or in flight, and comparing against `appliedQuery` (rather
  // than re-checking on every render) is what stops a stale worker
  // response — one for a query since resolved via the prefix path instead
  // — from clobbering an already-applied result.
  if (
    !isPending &&
    debouncedQuery.length >= 2 &&
    debouncedQuery !== appliedQuery
  ) {
    if (prefixMatches.length > 0) {
      setAppliedQuery(debouncedQuery);
      setSuggestions(prefixMatches);
    } else if (result && result.query === debouncedQuery) {
      setAppliedQuery(debouncedQuery);
      setSuggestions(result.results);
    }
  }

  // The one genuine external-system concern: ask the worker for a fuzzy
  // match once the query settles without a prefix match.
  useEffect(() => {
    if (isPending) return;
    if (debouncedQuery.length < 2) return;
    if (prefixMatches.length > 0) return;
    search(debouncedQuery);
  }, [debouncedQuery, isPending, prefixMatches, search]);

  // A too-short query never has suggestions, regardless of what's still in
  // state from a prior (now-abandoned) settle — no need to route this
  // derived case through a state update.
  return query.length < 2 ? [] : suggestions;
}
