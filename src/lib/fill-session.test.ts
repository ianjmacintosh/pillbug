import { describe, expect, test } from "vitest";
import {
  resolveCompartmentLabel,
  pillsNeeded,
  groupByMedicine,
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
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

  describe("3-compartment config", () => {
    test("00:00–11:59 resolves to Morn", () => {
      expect(resolveCompartmentLabel("00:00", THREE_COMPARTMENTS)).toBe("Morn");
      expect(resolveCompartmentLabel("11:59", THREE_COMPARTMENTS)).toBe("Morn");
    });

    test("12:00–17:59 resolves to Noon", () => {
      expect(resolveCompartmentLabel("12:00", THREE_COMPARTMENTS)).toBe("Noon");
      expect(resolveCompartmentLabel("17:59", THREE_COMPARTMENTS)).toBe("Noon");
    });

    test("18:00–23:59 resolves to Night", () => {
      expect(resolveCompartmentLabel("18:00", THREE_COMPARTMENTS)).toBe(
        "Night",
      );
      expect(resolveCompartmentLabel("23:59", THREE_COMPARTMENTS)).toBe(
        "Night",
      );
    });

    test("boundary: 11:59 is Morn, 12:00 is Noon, 17:59 is Noon, 18:00 is Night", () => {
      expect(resolveCompartmentLabel("11:59", THREE_COMPARTMENTS)).toBe("Morn");
      expect(resolveCompartmentLabel("12:00", THREE_COMPARTMENTS)).toBe("Noon");
      expect(resolveCompartmentLabel("17:59", THREE_COMPARTMENTS)).toBe("Noon");
      expect(resolveCompartmentLabel("18:00", THREE_COMPARTMENTS)).toBe(
        "Night",
      );
    });
  });

  describe("4-compartment config", () => {
    test("00:00–05:59 resolves to Morn", () => {
      expect(resolveCompartmentLabel("00:00", FOUR_COMPARTMENTS)).toBe("Morn");
      expect(resolveCompartmentLabel("05:59", FOUR_COMPARTMENTS)).toBe("Morn");
    });

    test("06:00–11:59 resolves to Noon", () => {
      expect(resolveCompartmentLabel("06:00", FOUR_COMPARTMENTS)).toBe("Noon");
      expect(resolveCompartmentLabel("11:59", FOUR_COMPARTMENTS)).toBe("Noon");
    });

    test("12:00–17:59 resolves to Eve", () => {
      expect(resolveCompartmentLabel("12:00", FOUR_COMPARTMENTS)).toBe("Eve");
      expect(resolveCompartmentLabel("17:59", FOUR_COMPARTMENTS)).toBe("Eve");
    });

    test("18:00–23:59 resolves to Bed", () => {
      expect(resolveCompartmentLabel("18:00", FOUR_COMPARTMENTS)).toBe("Bed");
      expect(resolveCompartmentLabel("23:59", FOUR_COMPARTMENTS)).toBe("Bed");
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

describe("groupByMedicine", () => {
  const everyDay = Object.fromEntries(
    [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ].map((d) => [d, [{ time: "08:00", quantity: 1 }]]),
  );

  test("single daily prescription produces one card with all compartment slots", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Lisinopril",
          dosage: "10mg",
          schedule: { days: everyDay },
        },
      ],
      TWO_COMPARTMENTS,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].drugName).toBe("Lisinopril");
    expect(cards[0].slots).toHaveLength(2);
    expect(cards[0].slots.map((s) => s.compartmentLabel)).toEqual(["AM", "PM"]);
  });

  test("all 7 days are populated in the correct slot", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Lisinopril",
          dosage: "10mg",
          schedule: { days: everyDay },
        },
      ],
      TWO_COMPARTMENTS,
    );
    const amSlot = cards[0].slots.find((s) => s.compartmentLabel === "AM")!;
    expect(Object.keys(amSlot.quantities)).toHaveLength(7);
    expect(amSlot.quantities["monday"]).toBe(1);
    expect(amSlot.quantities["sunday"]).toBe(1);
    const pmSlot = cards[0].slots.find((s) => s.compartmentLabel === "PM")!;
    expect(Object.keys(pmSlot.quantities)).toHaveLength(0);
  });

  test("weeklyTotal is correct per slot and per card", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Lisinopril",
          dosage: "10mg",
          schedule: { days: everyDay },
        },
      ],
      TWO_COMPARTMENTS,
    );
    expect(
      cards[0].slots.find((s) => s.compartmentLabel === "AM")!.weeklyTotal,
    ).toBe(7);
    expect(
      cards[0].slots.find((s) => s.compartmentLabel === "PM")!.weeklyTotal,
    ).toBe(0);
    expect(cards[0].weeklyTotal).toBe(7);
  });

  test("twice-daily prescription populates both compartment slots", () => {
    const schedule = {
      days: Object.fromEntries(
        [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ].map((d) => [
          d,
          [
            { time: "08:00", quantity: 1 },
            { time: "20:00", quantity: 1 },
          ],
        ]),
      ),
    };
    const cards = groupByMedicine(
      [{ drugName: "Metformin", dosage: "500mg", schedule }],
      TWO_COMPARTMENTS,
    );
    expect(
      cards[0].slots.find((s) => s.compartmentLabel === "AM")!.weeklyTotal,
    ).toBe(7);
    expect(
      cards[0].slots.find((s) => s.compartmentLabel === "PM")!.weeklyTotal,
    ).toBe(7);
    expect(cards[0].weeklyTotal).toBe(14);
  });

  test("per-slot quantity > 1 is accumulated correctly", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Metformin",
          dosage: "500mg",
          schedule: { days: { monday: [{ time: "08:00", quantity: 2 }] } },
        },
      ],
      TWO_COMPARTMENTS,
    );
    expect(
      cards[0].slots.find((s) => s.compartmentLabel === "AM")!.quantities[
        "monday"
      ],
    ).toBe(2);
    expect(cards[0].weeklyTotal).toBe(2);
  });

  test("prescription active only on some days leaves other days empty", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Atorvastatin",
          dosage: "20mg",
          schedule: {
            days: {
              monday: [{ time: "21:00", quantity: 1 }],
              friday: [{ time: "21:00", quantity: 1 }],
            },
          },
        },
      ],
      TWO_COMPARTMENTS,
    );
    const pmSlot = cards[0].slots.find((s) => s.compartmentLabel === "PM")!;
    expect(pmSlot.quantities["monday"]).toBe(1);
    expect(pmSlot.quantities["friday"]).toBe(1);
    expect(pmSlot.quantities["tuesday"]).toBeUndefined();
    expect(pmSlot.weeklyTotal).toBe(2);
  });

  test("two prescriptions produce two cards in input order", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Lisinopril",
          dosage: "10mg",
          schedule: { days: everyDay },
        },
        {
          drugName: "Metformin",
          dosage: "500mg",
          schedule: { days: everyDay },
        },
      ],
      ONE_COMPARTMENT,
    );
    expect(cards).toHaveLength(2);
    expect(cards[0].drugName).toBe("Lisinopril");
    expect(cards[1].drugName).toBe("Metformin");
  });

  test("slots are ordered by compartment config order", () => {
    const cards = groupByMedicine(
      [
        {
          drugName: "Lisinopril",
          dosage: "10mg",
          schedule: { days: everyDay },
        },
      ],
      FOUR_COMPARTMENTS,
    );
    expect(cards[0].slots.map((s) => s.compartmentLabel)).toEqual([
      "Morn",
      "Noon",
      "Eve",
      "Bed",
    ]);
  });

  test("empty prescription schedule produces a card with all-zero slots", () => {
    const cards = groupByMedicine(
      [{ drugName: "Lisinopril", dosage: "10mg", schedule: { days: {} } }],
      TWO_COMPARTMENTS,
    );
    expect(cards).toHaveLength(1);
    expect(cards[0].weeklyTotal).toBe(0);
    expect(cards[0].slots.every((s) => s.weeklyTotal === 0)).toBe(true);
  });

  test("empty prescriptions list returns empty array", () => {
    expect(groupByMedicine([], TWO_COMPARTMENTS)).toEqual([]);
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
