export { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";
import Fuse from "fuse.js";
import { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";

// Building the Fuse index over ~14k drug names is too slow to redo on every
// keystroke, so we cache one index per `names` array reference.
const fuseCache = new WeakMap<readonly string[], Fuse<string>>();

function getFuse(names: readonly string[]): Fuse<string> {
  let fuse = fuseCache.get(names);
  if (!fuse) {
    fuse = new Fuse(names as string[], {
      includeScore: true,
      threshold: 0.3,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
    fuseCache.set(names, fuse);
  }
  return fuse;
}

export function getDrugNameSuggestions(
  query: string,
  names: readonly string[],
): string[] {
  if (query.length < 2) return [];
  return getFuse(names)
    .search(query, { limit: 10 })
    .map((result) => result.item);
}

// Correctly-typed prefixes are the common case and near-free to check, so we
// try this before paying for a full fuzzy search (which runs in a worker).
export function getPrefixMatches(
  query: string,
  names: readonly string[],
): string[] {
  if (query.length < 2) return [];
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
