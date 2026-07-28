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

Use the silent endpoints to register or log in without sending an email. The token is stored in the database only — retrieve it with a second step.

**Register a new account:**

```bash
curl -s -X POST http://localhost:5173/api/register/silent \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
# {"ok":true}
```

**Log in to an existing account:**

```bash
curl -s -X POST http://localhost:5173/api/login/silent \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'
# {"ok":true}
```

**Retrieve the token from the database:**

```bash
npx wrangler d1 execute pillbug-staging --env staging --local \
  --command "SELECT token FROM magic_link_tokens ORDER BY rowid DESC LIMIT 1"
```

Then visit `http://localhost:5173/api/auth/verify?token=<token>` to complete the login and set a session cookie.

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
