# TanStack Router for client-side routing

Pillbug needs client-side routing across a defined set of authenticated and unauthenticated routes. We chose TanStack Router over React Router because it offers first-class TypeScript support (fully typed routes and params), has strong community momentum, and the project is new so there is no migration cost. React Router v7 (Remix v3) was also considered but its documentation has been a consistent source of frustration and the migration to the new API felt like churn without clear benefit.

## Considered Options

- **TanStack Router** — chosen: fully typed routes, stable v1 API, active community momentum, no migration cost on a greenfield project.
- **React Router v7 / Remix v3** — rejected: documentation quality has been disappointing; weaker TypeScript ergonomics relative to TanStack Router.
