export type { DayOfWeek } from "../../shared/schedule";

import type { DayOfWeek } from "../../shared/schedule";

export const WEEKDAYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const DOSAGE_UNITS = ["mg", "g", "mcg"] as const;
export type DosageUnit = (typeof DOSAGE_UNITS)[number];

export const supportedLngs = ["en-US", "pt-BR"] as const;
export const fallbackLng = "en-US" as const;
