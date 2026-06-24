export type DayOfWeek =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface PerSlotDose {
  time: string;
  quantity: number;
}

export interface Schedule {
  days: Partial<Record<DayOfWeek, PerSlotDose[]>>;
}
