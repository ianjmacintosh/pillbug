import { useCallback, type RefObject } from "react";
import { useBlocker } from "@tanstack/react-router";

export function useUnsavedChangesGuard(dirtyRef: RefObject<boolean>) {
  const shouldBlockFn = useCallback(() => dirtyRef.current, [dirtyRef]);
  const enableBeforeUnload = useCallback(() => dirtyRef.current, [dirtyRef]);

  const blocker = useBlocker({
    shouldBlockFn,
    enableBeforeUnload,
    withResolver: true,
  });

  return {
    isBlocked: blocker.status === "blocked",
    onLeave: () => blocker.proceed?.(),
    onStay: () => blocker.reset?.(),
  };
}
