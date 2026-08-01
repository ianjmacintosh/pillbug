# Explicit wrangler environments — root config is base only

Pillbug uses two named Wrangler environments: `production` and `staging`. The root config in `wrangler.jsonc` holds only shared scaffolding (`name`, `compatibility_date`, `main`, `assets`). It has no `d1_databases` binding, no `routes`, and no `vars`.

As a result, `wrangler deploy` without `--env` deploys a Worker that boots but crashes on any request that touches the database. This is intentional — all deployments must be explicit (`--env production` or `--env staging`).

## Why not keep the root config as implicit production?

D1 bindings and `vars` are non-inheritable in Wrangler — each environment must declare its own. If bindings must be re-declared per environment anyway, keeping a duplicate set at root adds no convenience and creates two places to maintain the production database ID.

Bare `wrangler deploy` also bypasses the environment name suffix that Cloudflare uses to separate Workers (`pillbug-production` vs `pillbug-staging`), making accidental production deploys harder to audit.

## Why `env.production` sets `name: "pillbug-production"` explicitly

By default, Wrangler names a Worker `<top-level-name>-<environment-name>`, which for `env.production` produces `pillbug-production`. `wrangler.jsonc` sets this explicitly so the intent is clear rather than relying on the default. See [Wrangler environments — inheritable keys](https://developers.cloudflare.com/workers/wrangler/configuration/#environments).

## Why not keep `workers_dev: true` at root?

Per Cloudflare docs, `workers_dev` is set per environment. Staging has `workers_dev: true` to support Cloudflare preview deployments. Production has no `workers_dev` setting — it is only reachable at its custom domain.

## Environments

| Environment  | Worker name          | URL                                 | D1 database       |
| ------------ | -------------------- | ----------------------------------- | ----------------- |
| `production` | `pillbug-production` | `pillbug.ianjmacintosh.com`         | `pillbug`         |
| `staging`    | `pillbug-staging`    | `pillbug-staging.ianjmacintosh.com` | `pillbug-staging` |

## Considered Options

- **Root = implicit production** — rejected: D1 bindings are non-inheritable, so staging still requires a full `env.staging` block. Keeping a duplicate at root adds maintenance overhead and allows unguarded bare deploys.
- **Root = explicit production, env.production is alias** — rejected: an empty `env.production: {}` block satisfies `--env production` but is confusing without context. Explicit bindings in `env.production` are clearer.
- **Explicit `env.production` + `env.staging`, root is base only** — chosen: each environment is self-contained, the root signals its own incompleteness with a comment, and CI always uses `--env`.
