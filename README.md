# Alpha Centauri

## Overview

This is a template project that uses:

- TypeScript
- React
- Vite (with Cloudflare plugin)
- Vitest
- Playwright
- ESLint
- Prettier
- GitHub Actions
- Wrangler

## Development

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
```

### Start a dev server

```bash
npm run dev
```

### Build the app

```bash
npm run build
```

## Deployment

### Deploying to Preview Environments

This project was intended to work with GitHub and Cloudflare to deploy each branch associated with a pull request to `main` to a new preview environment

### Deploying to Production

This project was intended to work with GitHub and Cloudflare to deploy all changes merged to `main` to production
