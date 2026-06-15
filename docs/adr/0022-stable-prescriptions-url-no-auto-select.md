# Stable /prescriptions URL — no auto-select of first prescription

`/prescriptions` is a permanent, stable route. It never auto-redirects based on prescription count or content.

## What we decided against

The previous implementation auto-navigated from `/prescriptions` to `/prescriptions/:id` (first prescription) on load when prescriptions existed. The proposed extension was to also auto-redirect to `/prescriptions/new` when the list was empty.

We removed both redirects.

## Why

**Privacy by Default.** Navigating to `/prescriptions` is itself an intentional reveal act — the Patient chose to open the prescriptions section. Auto-selecting and rendering the first prescription's detail goes a step further: it surfaces a specific drug name and schedule without any additional Patient action. A Patient getting help from a caregiver "over the shoulder" has already chosen to open the section, but may not intend to show the detail of a specific Prescription. Auto-selection removes that choice.

ADR-0016 removed the reveal gate on the Prescriptions screen on the grounds that navigating there is deliberate. Auto-selection sits on the wrong side of that same line.

**Back navigation.** Auto-redirecting makes `/prescriptions` a transient state — the Patient can never reliably navigate back to the list, because arriving there triggers another redirect. This is especially damaging on mobile, where "Back" is the primary way to return to the list.

## What /prescriptions shows instead

| State             | Desktop                                               | Mobile                   |
| ----------------- | ----------------------------------------------------- | ------------------------ |
| Loading           | Spinner / skeleton                                    | Spinner / skeleton       |
| Has prescriptions | List (left) + empty right panel                       | List                     |
| No prescriptions  | List (left, empty) + Create Prescription form (right) | Create Prescription form |

The empty-state form is rendered inline on the page — no redirect to `/prescriptions/new`. The Back button in the form panel is hidden in this state (there is no list to return to). After the Patient creates their first Prescription, the app navigates to `/prescriptions/:id` for the newly created record.

`/prescriptions/new` remains a valid standalone route reached by deliberate Patient action.
