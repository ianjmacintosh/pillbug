# Dosage stored as free text, not structured amount + unit

The `dosage` column on `prescriptions` is free text (e.g., "500mg", "two 20mg tablets", "1 puff"). We considered splitting it into `dosage_amount` (numeric) and `dosage_unit` (enum) to support future features like pill counting or partial-dose logging comparisons, but kept it as a single free-text field.

The deciding factors: dosage strings in practice are irregular and resist clean numeric splitting ("two 20mg tablets", "15mg–30mg as needed"), and the form's unit-picker helper (separate quantity and unit inputs concatenated into a single string on submit) addresses format ambiguity without requiring structured data. Structuring the field now would constrain future dosage expressions and require a migration over existing records if the unit enum ever needs expanding.

The trade-off accepted: any future feature that needs to compare or compute on dosage values (e.g., "do you have enough pills?") will require either a parsing pass over free-text values or a migration to add structured columns.

## New vs. legacy dosage strings

The Add Prescription form's unit picker has a `(blank)` option that stores the quantity with no unit appended — useful for brand-name drugs labeled only by name and count. When `(blank)` is selected, the submitted dosage is just the quantity string (e.g., "2" rather than "2 mg"). For all other selections, dosage is stored as "quantity unit" (e.g., "500 mg"). The Edit Prescription form detects whether the stored dosage matches the "quantity unit" format: if it does, it splits into the two-field picker; if not (e.g., "1 tablet", "two 20mg tablets"), it falls back to a plain-text input and preserves the original string on save. This asymmetry is intentional: new entries are nudged toward a consistent format, while existing free-text values are not destroyed by an edit.

The form also shows an inline advisory hint when the Patient types a value ending in a known unit suffix (e.g., "20mg") while the unit picker already shows that unit — it suggests the intended format ("20 mg") but does not block submission.

## Considered Options

- **Split into `dosage_amount` + `dosage_unit`** — rejected: irregular real-world dosage strings don't parse cleanly; constrains future expression forms; migration cost grows with data.
- **Free text with UI unit picker** — chosen: preserves expressive flexibility, eliminates format hesitation at input time, defers structuring until a concrete feature requires it.
