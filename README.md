# Pillbug

## Overview

Get reminders to take your prescriptions without needing to personally manage a bunch of recurring phone alarms or meetings

## Development

### Start a dev server

```bash
npm run dev
```

### Build the app

```bash
npm run build
```

### Working with Environment Variables

Environment variables are stored in `.env`

Review `.env.development` to see a list of expected environment variables

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

## Deployment

### Deploying to Preview Environments

This project was intended to work with GitHub and Cloudflare to deploy each branch associated with a pull request to `main` to a new preview environment

### Deploying to Production

This project was intended to work with GitHub and Cloudflare to deploy all changes merged to `main` to production
