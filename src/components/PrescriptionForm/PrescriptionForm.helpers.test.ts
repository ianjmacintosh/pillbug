import { describe, expect, test } from "vitest";
import drugNames from "../../data/drug-names.json";
import {
  getDrugNameSuggestions,
  getPrefixMatches,
  toDisplayCase,
} from "./PrescriptionForm.helpers";

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

  test("tolerates a typo in the bundled drug data", () => {
    expect(getDrugNameSuggestions("amoxicillan", drugNames)).toContain(
      "amoxicillin",
    );
    expect(getDrugNameSuggestions("hydroclorothiazide", drugNames)).toContain(
      "hydrochlorothiazide",
    );
  });

  test("does not surface an unrelated long name that loosely contains the query's letters out of order", () => {
    // Long enough that a query's letters could appear as a scattered
    // subsequence purely by chance, even though it's not a real match.
    const noise =
      "a-cet-x-o-x-m-i-n-o-p-h-e-n-plus-a-very-long-unrelated-chemical-suffix-that-goes-on-and-on-and-on";
    const names = ["acetaminophen", noise];
    expect(getDrugNameSuggestions("acetaminophen", names)).not.toContain(noise);
  });
});

describe("getPrefixMatches", () => {
  test("returns names starting with the query, case-insensitively", () => {
    const names = ["Enalapril", "enoxaparin", "ibuprofen"];
    expect(getPrefixMatches("enal", names)).toEqual(["Enalapril"]);
  });

  test("does not match a name that merely contains the query", () => {
    const names = ["hydrochlorothiazide"];
    expect(getPrefixMatches("chloro", names)).toEqual([]);
  });

  test("caps results at 10", () => {
    const names = Array.from({ length: 20 }, (_, i) => `enalapril-${i}`);
    expect(getPrefixMatches("enala", names)).toHaveLength(10);
  });

  test("returns no matches for fewer than 2 characters", () => {
    const names = ["enalapril", "enoxaparin"];
    expect(getPrefixMatches("e", names)).toEqual([]);
    expect(getPrefixMatches("", names)).toEqual([]);
  });

  test("does not tolerate typos (that's the fuzzy fallback's job)", () => {
    const names = ["amoxicillin"];
    expect(getPrefixMatches("amoxicillan", names)).toEqual([]);
  });
});

describe("toDisplayCase", () => {
  test("capitalizes only the first letter", () => {
    expect(toDisplayCase("metoprolol succinate")).toBe("Metoprolol succinate");
  });
});
