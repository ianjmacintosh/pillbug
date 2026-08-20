# Pillbug

## Overview

Get reminders to take your prescriptions without needing to personally manage a bunch of recurring phone alarms or meetings

## Development

### Dev Container Basics

Get the ID of your current container:

```
cat /etc/hostname
```

Open a terminal session from your local system to your dev container:

```
docker exec -it <container_id> bash
```

### Start a dev server

```bash
npm run dev
```

### Start a Wrangler dev server

```bash
npm run dev:wrangler
```

> NOTE: Runs the Worker via Wrangler alone, without `@cloudflare/vite-plugin`. Useful for isolating whether a bug is in the Worker or the Vite plugin layer.

### Authenticating locally (bypassing magic link email)

`/api/register/silent` and `/api/login/silent` were removed (see commit `0880a77`) because `login/silent` returned the plaintext PIN in the API response — anyone who knew a user's email could log in without inbox access. Do not recreate that pattern.

The current approach: call the real `/api/v1/login` (or `/api/v1/register`) endpoint with the Turnstile dummy token, then overwrite the stored `pin_hash` directly in the DB with the hash of a known PIN. This is what `npm run dev:login` automates:

```bash
npm run dev:login
```

This prints an `/enter-code?token=<uuid>` URL and a PIN (`1234`) for `http://localhost:5173`.

### Authenticating against staging or a preview deployment

```bash
npm run dev:login:staging
```

This does the same thing against the real `pillbug-staging` D1 (`--remote`) instead of local SQLite. A few non-obvious things that will waste your afternoon if you don't know them going in:

#### The seed step registers the test account on _remote_ `pillbug-staging` D1 automatically

`npm run dev:login:staging` runs `scripts/seed-test-accounts.js --env staging` before the login half. When passed `--env staging`, that script no longer touches local D1 — it POSTs to the real `/api/v1/register` on `https://pillbug-staging.ianjmacintosh.com`, so the deployed Worker registers (or no-ops, if the account already exists) using its own live secrets. You shouldn't need to register the test account by hand for this path.

If that step is skipped somehow — e.g. you run `dev-login.js` directly instead of through `dev:login:staging` — and the account doesn't exist remotely, `POST /api/v1/login` still returns a decoy token (`patient_id: null`) rather than an error, by design, so a nonexistent-account attempt is indistinguishable from a real one (`worker/auth.ts` `sendLoginLink`, anti-enumeration). `dev-login.js` detects this itself (via the `UPDATE ... RETURNING patient_id` result) and throws immediately with an actionable message, rather than handing back a token/PIN that can never work. If you need to register the account by hand anyway:

```sh
curl -X POST https://pillbug-staging.ianjmacintosh.com/api/v1/register -H "Content-Type: application/json" -d '{"email":"test-user-alice@pillbug.ianjmacintosh.com","turnstileToken":"XXXX.DUMMY.TOKEN.XXXX"}'
```

#### Your local `PIN_SECRET` (`.env`) must exactly match the real Cloudflare Worker secret for `pillbug-staging`

The DB-override trick computes `pin_hash` locally, so the deployed Worker has to hash the submitted PIN with the same secret to get a match. Cloudflare secrets are write-only (no `wrangler secret get`), so there's no way to diff them. You can sync staging from your local `.env` straight into Wrangler rather than copy-pasting through the dashboard: `grep '^PIN_SECRET=' .env | cut -d= -f2- | npx wrangler versions secret put PIN_SECRET --env staging`, then `npx wrangler versions deploy --env staging`. (Plain `wrangler secret put` will fail with "the latest version of your Worker isn't currently deployed" here, since PR previews use `wrangler versions upload`, which never promotes to 100% traffic — use `versions secret put` instead.)

#### Preview deployments are not a separate environment.

`npm run deploy:preview` runs `wrangler versions upload --env staging` — every PR preview is just another Version of the same `pillbug-staging` Worker, sharing the exact same D1 database and the exact same secrets as staging proper. A token/PIN created against `pillbug-staging.ianjmacintosh.com` works identically against any of that PR's preview URLs (find them in the Cloudflare bot's PR comment) — swap the hostname, keep the token and PIN.

- If `wrangler` isn't on your `PATH` as a bare command, use `npx wrangler` — `dev-login.js`'s own `execFileSync("wrangler", ...)` call will fail with `ENOENT` in that case; run its `wrangler d1 execute` step manually with `npx` instead.

### Build the app

```bash
npm run build
```

### Working with Environment Variables

Environment variables are stored in `.env`

Review `.env.EXAMPLE` to see a list of expected environment variables

The `.env` file is ignored by git (see `.gitignore`) and has a Claude permissions block (`.claude/settings.json`) as per [John Lundquist's recommendation](https://egghead.io/protect-secrets-from-being-read-by-claude-code~vd9jk)

> In the future, secrets should be managed using a secure system. After migrating to a secure secret manager, all data in `.env` should be considered leaked

### Working with Agents

For authoritative information about installing Claude Code, visit [Claude Code Quickstart instructions](iIbxtXzfFyrTUxbtpHdyGtjose8KMi4mwo7rPz5ngNBbLcWr#kc1F9olqx7TzVXPaC8eOjQ1xwxkmuEoHFKttreLPV98)

```bash
npm run claude:install
```

This repository includes Matt Pocock's skills files. Authoritative setup instructions can be found in [`mattpocock/skills`](https://github.com/mattpocock/skills/#quickstart-30-second-setup):

```bash
npx skills@latest add mattpocock/skills

# Pick /setup-matt-pocock-skills

# Run /setup-matt-pocock-skills in your agent

# Restart Claude
```

This repository uses [gstack](https://github.com/garrytan/gstack) for browser automation and AI workflows. Install it once per machine:

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack && cd ~/.claude/skills/gstack && ./setup
```

> **Note:** gstack requires [bun](https://bun.sh). If not installed, run:
>
> ```bash
> curl -fsSL https://bun.sh/install | bash
> ```
>
> then re-run the gstack setup command above.

## Deployment

Two named environments are configured in `wrangler.jsonc`. Always deploy with an explicit `--env` flag — bare `wrangler deploy` has no database binding and will crash at runtime.

| Environment  | URL                                 | Command                     |
| ------------ | ----------------------------------- | --------------------------- |
| `production` | `pillbug.ianjmacintosh.com`         | `npm run deploy:production` |
| `staging`    | `staging.pillbug.ianjmacintosh.com` | `npm run deploy:staging`    |

Each deploy script applies pending D1 migrations before uploading the Worker.

### Staging secrets

Before the first staging deploy, set Worker secrets for the `staging` environment:

```bash
wrangler secret put RESEND_API_KEY --env staging
wrangler secret put TURNSTILE_SECRET_KEY --env staging
```

Use Cloudflare's always-passes test secret key (`1x0000000000000000000000000000000AA`) for staging. The matching always-passes site key (`1x00000000000000000000AA`) must be set as a build environment variable (`VITE_TURNSTILE_SITE_KEY`) in Cloudflare's build settings for the staging environment.

### Preview environments

Cloudflare build settings use `deploy:preview` for non-production branch deployments. It applies staging migrations and uploads a versioned Worker to the staging environment:

```bash
npm run deploy:preview
```
