# Medication name autocomplete: Ariakit Combobox, Web Worker fuzzy search, normalized edit distance

Issue #283 proposed `match-sorter` against a raw RxNorm `tty=IN` ingredient list, rendered via a native `<datalist>`. The implementation that shipped diverged from that plan in three ways, each with its own rationale, recorded here so the reasoning isn't scattered across commits and code comments alone.

## Considered options

### Data source: curated "Prescribable RxTerms ingredients," not raw RxNorm `tty=IN`

RxNorm's full ingredient concept set (`tty=IN`) is ~14,648 entries, including excipients, vaccine antigens, and other chemical entries never actually prescribed to a patient. Switched to NLM's curated Prescribable RxTerms ingredient list (`clinicaltables.nlm.nih.gov/api/drug_ingredients`), scoped to ingredients of currently marketed drug products — 2,332 names, all clinically relevant. Fetched on demand via `npm run data:fetch-drug-names` (`scripts/fetch-rxnorm-names.js` → `src/data/drug-names.json`); not integrated into CI, same as originally proposed.

### UI: Ariakit `Combobox`, not native `<datalist>`

The issue proposed `<datalist>` for its native accessibility and zero-CSS simplicity, including a "degrades gracefully if JS fails to load" argument. That argument doesn't actually hold in this app: Pillbug is a full client-rendered SPA, so a JS failure means nothing renders at all, not just the autocomplete — the no-JS fallback case `<datalist>` optimizes for isn't reachable here. Built on Ariakit's `Combobox`/`ComboboxPopover`/`ComboboxList`/`ComboboxItem` instead (`DrugNameCombobox.tsx`), continuing the direction set in ADR-0023, which named this feature as Ariakit's next planned use after the shared `Dialog`. Ariakit keeps full control over result ordering and rendering (needed for fuzzy-match ranking) while still following the WAI-ARIA combobox pattern, which `<datalist>`'s browser-native, non-customizable filtering doesn't give up.

### Matching: Fuse.js, then replaced with a custom normalized-edit-distance ranker

`match-sorter` (as originally proposed) was never used; the team reached for Fuse.js first for its built-in fuzzy typo tolerance. Fuse.js was later removed entirely after diagnosing a structural scoring problem: its score is `errors / patternLen`, normalized only by the _query's_ length, never the candidate word's length. This under-scores short or truncated queries against long candidate words regardless of `threshold` tuning — e.g. `"omprzl"` (6 chars) against `"omeprazole"` (10 chars) returned zero results at any reasonable threshold, and `"omapz"` surfaced `chlorpromazine` (edit distance 11) and `somapacitan` (edit distance 7) while excluding `omeprazole` (edit distance 6) from the candidate set outright. No Fuse.js option changes that normalization denominator — this isn't a tuning problem.

Replaced with a from-scratch Levenshtein distance (`levenshteinDistance` in `PrescriptionForm.helpers.ts`), normalized by `max(query.length, name.length)` instead, with a `MAX_NORMALIZED_DISTANCE = 0.6` cutoff chosen empirically against the corpus and the typo cases above. Brute-force scoring the full corpus benchmarks at ~3–9ms, which is practical now that the corpus is 2,332 names (curated list, above) rather than ~14,648 — and runs off the main thread regardless (see below). `fuse.js` was removed from `package.json`.

## Consequences

Each concern lives in exactly one file/hook:

| Concern                                                        | File(s)                                                                                                                                                                                        |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Medication name data                                           | `src/data/drug-names.json`, refreshed via `scripts/fetch-rxnorm-names.js`                                                                                                                      |
| What names match, and their ranking                            | `PrescriptionForm.helpers.ts` — `getPrefixMatches` (exact prefix fast path), `getDrugNameSuggestions` (normalized edit-distance fuzzy fallback)                                                |
| Off-main-thread execution                                      | `drugNameSearch.worker.ts` (worker entry point), `drugNameWorkerClient.ts` (mockable factory), `useDrugNameSearchWorker.ts` (RPC lifecycle: create/terminate, `setNames`, request correlation) |
| Debounce                                                       | `src/hooks/useDebouncedValue.ts` — generic, `lodash-es`-backed; first hook to live outside a feature folder, intended as the precedent for future reusable hooks                               |
| Orchestration (prefix vs. fuzzy, keep-previous-while-settling) | `useDrugNameSuggestions.ts`                                                                                                                                                                    |
| Markup / styling                                               | `DrugNameCombobox.tsx`, `Prescriptions.css`                                                                                                                                                    |

Regional/brand names (e.g. Brazilian "Renitec") remain out of scope, per the original issue — autocomplete is advisory only, any free text is still accepted and submittable.
