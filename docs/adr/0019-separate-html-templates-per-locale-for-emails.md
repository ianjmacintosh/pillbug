# Separate HTML template files per locale for email bodies

The Worker sends two email types (Verification and Login) using HTML templates imported as raw strings at build time. When pt-BR was added, the question was whether to introduce i18next core on the Worker to drive template translation, or to keep separate template files per locale. We use separate files.

## Considered options

**i18next core on the Worker**: initialise an i18next instance server-side and use `t()` to produce translated strings, then inject them into a single template per email type. This is what the issue originally proposed ("i18next core (Worker, for emails)").

**Separate HTML files per locale** (chosen): `verification.html` / `verification.pt-BR.html`, `login.html` / `login.pt-BR.html`. The Worker selects the right file based on the patient's stored language. Email subjects (shorter strings) live in the shared TypeScript locale store alongside all UI strings.

## Why separate files

- The Worker already has a working `renderTemplate` / token-substitution pattern. i18next adds a library initialisation step just to swap two HTML files.
- Separate files keep all localizable content for a given language in one place — easy to hand to a translator without needing to understand the codebase.
- i18next resolution logic would duplicate the locale matching already handled by react-i18next on the frontend. The frontend resolves the locale and stores it; the Worker just needs to consume it.
- Adding a third language means adding two more template files, not reconfiguring a library.

## Consequences

Adding a new locale requires a new set of `.{locale}.html` template files for each email type, plus entries in the shared locale store for the subject lines.
