import { useEffect, useMemo, useState } from "react";
import { debounce } from "lodash-es";

export interface UseDebouncedValueResult<T> {
  /** The most recently *settled* value. Lags `value` by up to `delayMs`. */
  value: T;
  /** True from the moment the input changes until the debounce settles. */
  isPending: boolean;
  /** Immediately settle to the latest pending value. */
  flush: () => void;
  /** Discard the pending update; `value`/`isPending` stay as-is. */
  cancel: () => void;
}

// `isPending` starts `true` so a component that mounts with a non-empty
// value already behaves like one where that value was just typed — the
// first commit is subject to the debounce delay too, not just later ones.
export function useDebouncedValue<T>(
  value: T,
  delayMs: number,
): UseDebouncedValueResult<T> {
  const [debouncedValue, setDebouncedValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  const [isPending, setIsPending] = useState(true);

  // Flip `isPending` the instant `value` changes, synchronously during
  // render rather than in an effect — this is adjusting state in response
  // to a prop change (see "Adjusting state when a prop changes" in the
  // React docs), not synchronizing with an external system, so it
  // shouldn't wait for an effect to run.
  if (value !== prevValue) {
    setPrevValue(value);
    setIsPending(true);
  }

  const debouncedCommit = useMemo(
    () =>
      debounce((next: T) => {
        setDebouncedValue(next);
        setIsPending(false);
      }, delayMs),
    [delayMs],
  );

  // Scheduling the debounced commit is the one genuine external-system
  // concern here (it starts a timer), so it stays in an effect.
  useEffect(() => {
    debouncedCommit(value);
  }, [value, debouncedCommit]);

  // Cancels the in-flight timer both on unmount and whenever `delayMs`
  // changes and a new `debouncedCommit` is created (cleanup runs before the
  // next effect body for the new deps).
  useEffect(() => {
    return () => debouncedCommit.cancel();
  }, [debouncedCommit]);

  return {
    value: debouncedValue,
    isPending,
    flush: () => debouncedCommit.flush(),
    cancel: () => debouncedCommit.cancel(),
  };
}
