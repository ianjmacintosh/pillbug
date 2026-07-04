# Adopt Ariakit for interactive UI primitives, starting with a shared Dialog component

Issue #268 (unsaved-changes confirmation on the Prescription forms) needs a modal dialog with Leave/Stay actions. The existing precedent, `DeleteDialog.tsx`, uses the native `<dialog>` element directly, which would have been sufficient for this one case — but we chose to introduce `@ariakit/react` and build a shared, controlled `Dialog` component instead, since this dialog is the deliberate starting point for adopting Ariakit across the app (autocomplete/combobox for #102, tooltips, and possibly buttons next). `DeleteDialog` will be migrated to consume the new shared `Dialog` component rather than maintaining two separate dialog implementations side by side.

## Considered Options

- **Native `<dialog>` element** (matching the existing `DeleteDialog.tsx`) — rejected as the long-term choice: sufficient for a single confirm/cancel dialog, but doesn't help with the more complex ARIA patterns (combobox, tooltip) planned next, and would leave the app with two different overlay approaches side by side.
- **`@ariakit/react`** (chosen) — modular, stable release line (0.4.x), unlike the all-in-one `ariakit` package which is still `2.0.0-next`; tree-shakeable per component.

## Consequences

- A new shared, controlled `Dialog` component (`open` / `onClose` / `title` / `children`) wraps Ariakit's `useDialogStore` + `Dialog` internally; consumers never touch the Ariakit store directly.
- `DeleteDialog.tsx` is migrated to consume the shared `Dialog` rather than rendering its own native `<dialog>`.
- The unsaved-changes dialog for #268 is driven by `useBlocker`'s `status === 'blocked'` resolver, mapped to the shared `Dialog`'s `open`/`onClose` props.
