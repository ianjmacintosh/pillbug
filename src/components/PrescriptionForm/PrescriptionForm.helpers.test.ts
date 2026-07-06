import { describe, expect, test } from "vitest";
import drugNames from "../../data/drug-names.json";
import { getDrugNameSuggestions } from "./PrescriptionForm.helpers";

describe("getDrugNameSuggestions", () => {
  test("returns matching names for a partial query", () => {
    const names = ["enalapril", "enoxaparin", "ibuprofen"];
    expect(getDrugNameSuggestions("enala", names)).toContain("enalapril");
  });

  test("caps results at 10", () => {
    const names = Array.from({ length: 20 }, (_, i) => `enalapril-${i}`);
    expect(getDrugNameSuggestions("enala", names)).toHaveLength(10);
  });

  test("returns no suggestions for fewer than 2 characters", () => {
    const names = ["enalapril", "enoxaparin"];
    expect(getDrugNameSuggestions("e", names)).toEqual([]);
    expect(getDrugNameSuggestions("", names)).toEqual([]);
  });

  test("finds enalapril in the bundled drug data", () => {
    expect(getDrugNameSuggestions("enala", drugNames)).toContain("enalapril");
  });

  test("finds a metoprolol variant in the bundled drug data", () => {
    expect(
      getDrugNameSuggestions("metop", drugNames).some((name) =>
        name.startsWith("metoprolol"),
      ),
    ).toBe(true);
  });
});
