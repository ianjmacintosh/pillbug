import { useEffect, useMemo, useState } from "react";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useDrugNameSearchWorker } from "./useDrugNameSearchWorker";
import { getPrefixMatches } from "./PrescriptionForm.helpers";

export interface DrugNameSuggestionsSettings {
  /**
   * Characters typed before any suggestion (prefix or fuzzy) is
   * considered at all. Below this, nothing is searched or shown.
   * Default 3.
   */
  minChars?: number;
  /**
   * How long to wait, after typing pauses, before reacting — for both the
   * instant prefix-match path and the fuzzy worker fallback. Without this,
   * suggestions would open and update on every keystroke while the user is
   * still mid-word. Default 400.
   */
  debounceMs?: number;
}

export const DEFAULT_MIN_CHARS = 3;
export const DEFAULT_SUGGESTIONS_DEBOUNCE_MS = 400;

// A full-corpus fuzzy scan blocks the main thread for noticeably long on a
// throttled device, so the fuzzy fallback runs in a worker rather than
// synchronously in this hook.
export function useDrugNameSuggestions(
  query: string,
  names: readonly string[],
  settings: DrugNameSuggestionsSettings = {},
): string[] {
  const minChars = settings.minChars ?? DEFAULT_MIN_CHARS;
  const debounceMs = settings.debounceMs ?? DEFAULT_SUGGESTIONS_DEBOUNCE_MS;

  const { value: debouncedQuery, isPending } = useDebouncedValue(
    query,
    debounceMs,
  );
  const { search, result } = useDrugNameSearchWorker(names);

  const prefixMatches = useMemo(
    () =>
      isPending || debouncedQuery.length < minChars
        ? []
        : getPrefixMatches(debouncedQuery, names),
    [isPending, debouncedQuery, names, minChars],
  );

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [appliedQuery, setAppliedQuery] = useState<string | null>(null);

  // Forget any remembered answer the instant the query drops below
  // minChars — not just hide it. Without this, `suggestions` keeps
  // whatever it last held (e.g. results for a word the user has since
  // cleared entirely), and typing enough characters for a brand new,
  // unrelated search would show that stale answer again immediately,
  // until the new search settles and corrects it. Keyed off the raw
  // `query` (same as the final return below), not `debouncedQuery`, so
  // this fires synchronously on the clearing keystroke itself rather than
  // waiting for a debounce settle — otherwise a fast clear-and-retype,
  // typed before the debounce ever gets a chance to settle on the
  // short/empty intermediate value, would skip the reset entirely.
  if (
    query.length < minChars &&
    (suggestions.length > 0 || appliedQuery !== null)
  ) {
    setSuggestions([]);
    setAppliedQuery(null);
  }

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
    debouncedQuery.length >= minChars &&
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
    if (debouncedQuery.length < minChars) return;
    if (prefixMatches.length > 0) return;
    search(debouncedQuery);
  }, [debouncedQuery, isPending, prefixMatches, search, minChars]);

  // `suggestions` is already reset above whenever the query is too short,
  // so this is a cheap same-render guarantee rather than a second source
  // of truth: covers the render where the reset above just fired, before
  // the resulting state update has been read back.
  return query.length < minChars ? [] : suggestions;
}
