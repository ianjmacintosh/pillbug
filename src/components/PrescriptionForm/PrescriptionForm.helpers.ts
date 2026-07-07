export { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";
import { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";

// Standard edit-distance DP, O(min space) via two rolling rows.
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

// A library like Fuse.js scores by errors-per-query-length, which
// structurally under-scores short queries against long candidate words
// (e.g. "omprzl" vs "omeprazole") regardless of how the threshold is
// tuned — normalizing by the *longer* of the two strings instead is what
// lets a truncated/typo'd query still surface the full word it was aiming
// for. 0.6 was picked empirically: loose enough to catch multi-character
// typos and truncations, tight enough to exclude unrelated names.
const MAX_NORMALIZED_DISTANCE = 0.6;

// How many characters are "enough" to search on is a UX policy (see
// DrugNameSuggestionsSettings in useDrugNameSuggestions.ts) owned by the
// caller, not this pure matching function — the only length this function
// itself cares about is the degenerate empty-string case.
export function getDrugNameSuggestions(
  query: string,
  names: readonly string[],
): string[] {
  if (!query) return [];
  const lowerQuery = query.toLowerCase();
  return names
    .map((name) => {
      const distance = levenshteinDistance(lowerQuery, name.toLowerCase());
      const normalizedDistance =
        distance / Math.max(lowerQuery.length, name.length);
      return { name, distance, normalizedDistance };
    })
    .filter((result) => result.normalizedDistance <= MAX_NORMALIZED_DISTANCE)
    .sort(
      (a, b) =>
        a.normalizedDistance - b.normalizedDistance || a.distance - b.distance,
    )
    .slice(0, 10)
    .map((result) => result.name);
}

// Correctly-typed prefixes are the common case and near-free to check, so we
// try this before paying for a full fuzzy search (which runs in a worker).
export function getPrefixMatches(
  query: string,
  names: readonly string[],
): string[] {
  if (!query) return [];
  const lower = query.toLowerCase();
  const results: string[] = [];
  for (const name of names) {
    if (name.toLowerCase().startsWith(lower)) {
      results.push(name);
      if (results.length === 10) break;
    }
  }
  return results;
}

export function toDisplayCase(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function detectUnitInQuantity(quantity: string): DosageUnit | null {
  const sorted = ([...DOSAGE_UNITS] as string[]).sort(
    (a, b) => b.length - a.length,
  );
  const found = sorted.find((u) => quantity.toLowerCase().endsWith(u));
  return (found as DosageUnit) ?? null;
}

export function parseDosage(
  raw: string,
): { quantity: string; unit: DosageUnit } | null {
  const i = raw.lastIndexOf(" ");
  if (i === -1) return null;
  const unit = raw.slice(i + 1);
  if (!(DOSAGE_UNITS as readonly string[]).includes(unit)) return null;
  return { quantity: raw.slice(0, i), unit: unit as DosageUnit };
}
