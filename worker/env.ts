export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  RESEND_API_KEY: string;
  APP_URL: string;
  TURNSTILE_SECRET_KEY: string;
  EMAIL_SECRET: string;
  PIN_SECRET: string;
  EMAIL_MOCK?: string;
  CF_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  CF_ACCESS_MOCK?: string;
  BROWSER: Fetcher;
}
