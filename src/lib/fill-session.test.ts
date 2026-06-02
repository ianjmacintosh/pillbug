import { describe, expect, test } from "vitest";
import {
  resolveCompartmentLabel,
  pillsNeeded,
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  FOUR_COMPARTMENTS,
} from "./fill-session";

describe("resolveCompartmentLabel", () => {
  describe("1-compartment config", () => {
    test("any time resolves to Daily", () => {
      expect(resolveCompartmentLabel("00:00", ONE_COMPARTMENT)).toBe("Daily");
      expect(resolveCompartmentLabel("08:00", ONE_COMPARTMENT)).toBe("Daily");
      expect(resolveCompartmentLabel("23:59", ONE_COMPARTMENT)).toBe("Daily");
    });
  });

  describe("2-compartment config", () => {
    test("hour 12:00 resolves to PM", () => {
      expect(resolveCompartmentLabel("12:00", TWO_COMPARTMENTS)).toBe("PM");
    });

    test("hour 08:00 resolves to AM", () => {
      expect(resolveCompartmentLabel("08:00", TWO_COMPARTMENTS)).toBe("AM");
    });

    test("boundary: 11:59 is AM, 12:00 is PM", () => {
      expect(resolveCompartmentLabel("11:59", TWO_COMPARTMENTS)).toBe("AM");
      expect(resolveCompartmentLabel("12:00", TWO_COMPARTMENTS)).toBe("PM");
    });
  });

  describe("4-compartment config", () => {
    test("00:00–05:59 resolves to AM", () => {
      expect(resolveCompartmentLabel("00:00", FOUR_COMPARTMENTS)).toBe("AM");
      expect(resolveCompartmentLabel("05:59", FOUR_COMPARTMENTS)).toBe("AM");
    });

    test("06:00–11:59 resolves to Noon", () => {
      expect(resolveCompartmentLabel("06:00", FOUR_COMPARTMENTS)).toBe("Noon");
      expect(resolveCompartmentLabel("11:59", FOUR_COMPARTMENTS)).toBe("Noon");
    });

    test("12:00–17:59 resolves to PM", () => {
      expect(resolveCompartmentLabel("12:00", FOUR_COMPARTMENTS)).toBe("PM");
      expect(resolveCompartmentLabel("17:59", FOUR_COMPARTMENTS)).toBe("PM");
    });

    test("18:00–23:59 resolves to Bedtime", () => {
      expect(resolveCompartmentLabel("18:00", FOUR_COMPARTMENTS)).toBe(
        "Bedtime",
      );
      expect(resolveCompartmentLabel("23:59", FOUR_COMPARTMENTS)).toBe(
        "Bedtime",
      );
    });
  });

  describe("wrap-around compartment", () => {
    const lateNightConfig = [
      { label: "Day", startTime: "06:00", endTime: "20:59" },
      { label: "Bedtime", startTime: "21:00", endTime: "05:59" },
    ];

    test("time before midnight resolves to Bedtime", () => {
      expect(resolveCompartmentLabel("22:00", lateNightConfig)).toBe("Bedtime");
    });

    test("time after midnight resolves to Bedtime", () => {
      expect(resolveCompartmentLabel("01:00", lateNightConfig)).toBe("Bedtime");
    });

    test("daytime resolves to Day", () => {
      expect(resolveCompartmentLabel("09:00", lateNightConfig)).toBe("Day");
    });
  });
});

describe("pillsNeeded", () => {
  const everyDay = {
    monday: [{ time: "08:00", quantity: 1 }],
    tuesday: [{ time: "08:00", quantity: 1 }],
    wednesday: [{ time: "08:00", quantity: 1 }],
    thursday: [{ time: "08:00", quantity: 1 }],
    friday: [{ time: "08:00", quantity: 1 }],
    saturday: [{ time: "08:00", quantity: 1 }],
    sunday: [{ time: "08:00", quantity: 1 }],
  };

  test("once-daily prescription over 7 days", () => {
    expect(pillsNeeded({ days: everyDay }, 7)).toBe(7);
  });

  test("once-daily prescription scales with span: 14 days = 14 pills", () => {
    expect(pillsNeeded({ days: everyDay }, 14)).toBe(14);
  });

  test("twice-daily prescription over 7 days", () => {
    const schedule = {
      days: {
        monday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        tuesday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        wednesday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        thursday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        friday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        saturday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
        sunday: [
          { time: "08:00", quantity: 1 },
          { time: "20:00", quantity: 1 },
        ],
      },
    };
    expect(pillsNeeded(schedule, 7)).toBe(14);
  });

  test("per-slot quantity variation: 2 tablets AM, 1 tablet PM over 7 days", () => {
    const schedule = {
      days: {
        monday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        tuesday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        wednesday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        thursday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        friday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        saturday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
        sunday: [
          { time: "08:00", quantity: 2 },
          { time: "20:00", quantity: 1 },
        ],
      },
    };
    expect(pillsNeeded(schedule, 7)).toBe(21);
  });

  test("prescription active only on weekdays over 7 days", () => {
    const schedule = {
      days: {
        monday: [{ time: "08:00", quantity: 1 }],
        tuesday: [{ time: "08:00", quantity: 1 }],
        wednesday: [{ time: "08:00", quantity: 1 }],
        thursday: [{ time: "08:00", quantity: 1 }],
        friday: [{ time: "08:00", quantity: 1 }],
      },
    };
    expect(pillsNeeded(schedule, 7)).toBe(5);
    expect(pillsNeeded(schedule, 14)).toBe(10);
  });

  test("empty schedule needs 0 pills", () => {
    expect(pillsNeeded({ days: {} }, 7)).toBe(0);
  });
});

describe("resolveCompartmentLabel error cases", () => {
  test("throws on invalid time format", () => {
    expect(() => resolveCompartmentLabel("8am", TWO_COMPARTMENTS)).toThrow(
      "invalid time",
    );
  });

  test("throws on invalid compartment startTime", () => {
    expect(() =>
      resolveCompartmentLabel("08:00", [
        { label: "X", startTime: "bad", endTime: "12:00" },
      ]),
    ).toThrow("invalid compartment startTime");
  });

  test("throws on invalid compartment endTime", () => {
    expect(() =>
      resolveCompartmentLabel("08:00", [
        { label: "X", startTime: "00:00", endTime: "bad" },
      ]),
    ).toThrow("invalid compartment endTime");
  });

  test("throws when time falls in a gap (invalid config)", () => {
    const gappyConfig = [
      { label: "AM", startTime: "00:00", endTime: "11:59" },
      { label: "PM", startTime: "14:00", endTime: "23:59" },
    ];
    expect(() => resolveCompartmentLabel("13:00", gappyConfig)).toThrow(
      "does not match any compartment",
    );
  });
});
