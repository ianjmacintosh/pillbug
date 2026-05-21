# Dosage stored as free text, not structured amount + unit

The `dosage` column on `prescriptions` is free text (e.g., "500mg", "two 20mg tablets", "1 puff"). We considered splitting it into `dosage_amount` (numeric) and `dosage_unit` (enum) to support future features like pill counting or partial-dose logging comparisons, but kept it as a single free-text field.

The deciding factors: dosage strings in practice are irregular and resist clean numeric splitting ("two 20mg tablets", "15mg–30mg as needed"), and the form's unit-picker helper (which appends a unit suffix to the text field) addresses format ambiguity without requiring structured data. Structuring the field now would constrain future dosage expressions and require a migration over existing records if the unit enum ever needs expanding.

The trade-off accepted: any future feature that needs to compare or compute on dosage values (e.g., "do you have enough pills?") will require either a parsing pass over free-text values or a migration to add structured columns.

## Considered Options

- **Split into `dosage_amount` + `dosage_unit`** — rejected: irregular real-world dosage strings don't parse cleanly; constrains future expression forms; migration cost grows with data.
- **Free text with UI unit picker** — chosen: preserves expressive flexibility, eliminates format hesitation at input time, defers structuring until a concrete feature requires it.
