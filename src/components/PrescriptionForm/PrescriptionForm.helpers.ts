export { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";
import { matchSorter } from "match-sorter";
import { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";

export function getDrugNameSuggestions(
  query: string,
  names: readonly string[],
): string[] {
  if (query.length < 2) return [];
  return matchSorter(names, query).slice(0, 10);
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
