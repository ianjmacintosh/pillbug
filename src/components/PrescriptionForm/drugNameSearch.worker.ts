import { getDrugNameSuggestions } from "./PrescriptionForm.helpers";

export type DrugSearchWorkerRequest =
  | { type: "setNames"; names: readonly string[] }
  | { type: "search"; requestId: number; query: string };

export interface DrugSearchWorkerResponse {
  requestId: number;
  query: string;
  results: string[];
}

// Narrow interface instead of the ambient `webworker` lib, which would
// otherwise conflict with this project's DOM-lib tsconfig for `src`.
interface WorkerGlobalLike {
  onmessage: ((event: MessageEvent<DrugSearchWorkerRequest>) => void) | null;
  postMessage(message: DrugSearchWorkerResponse): void;
}

const ctx = self as unknown as WorkerGlobalLike;

let names: readonly string[] = [];

ctx.onmessage = (event) => {
  const message = event.data;
  if (message.type === "setNames") {
    names = message.names;
    return;
  }
  ctx.postMessage({
    requestId: message.requestId,
    query: message.query,
    results: getDrugNameSuggestions(message.query, names),
  });
};
