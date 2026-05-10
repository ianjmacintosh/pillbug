# Sequential D1 migrations — one open PR at a time

Preview deploys run against the shared `pillbug-staging` D1 database. `npm run deploy:preview` applies staging migrations remotely before uploading a version, so every open PR that adds a migration file will race to modify the same schema.

The policy is: **never have two open PRs that each add a migration file**. Merge a migration PR before opening another branch that needs one.

## Why not a migration branching tool?

Tools like Atlas support branching migration graphs, but they add tooling overhead that isn't justified at the current team size (solo developer). The sequential constraint is easy to honour in practice and eliminates the entire class of problem.

## Why not skip migrations in preview deploys?

A preview deploy that doesn't apply its own migration would start up against a stale schema and break immediately. Migrations must run before the Worker is uploaded.

## Considered Options

- **Sequential policy (convention only)** — chosen: zero tooling cost, sufficient for a solo developer, easy to enforce by checking before opening a PR.
- **Atlas or similar branching migration tool** — deferred: adds meaningful complexity; revisit if the team grows or concurrent migration PRs become a recurring problem.
- **Skip migrations in preview deploys** — rejected: the deployed Worker would immediately fail against a stale schema.
