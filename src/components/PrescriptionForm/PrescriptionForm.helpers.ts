export { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";
import { DOSAGE_UNITS, type DosageUnit } from "../../utils/constants";

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
