import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "../utils/i18n";

afterEach(() => cleanup());

window.scrollTo = vi.fn() as typeof window.scrollTo;

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_callback: IntersectionObserverCallback) {}
}
vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

// jsdom has no real Worker implementation. This harmless no-op stub lets
// components that spin up a worker (e.g. DrugNameCombobox) render without
// crashing; tests that need to control worker responses mock the specific
// factory module instead (see useDrugNameSuggestions.test.tsx).
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  postMessage = vi.fn();
  terminate = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  dispatchEvent = vi.fn();
}
vi.stubGlobal("Worker", MockWorker);
