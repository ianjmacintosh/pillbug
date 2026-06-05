import enUS, { type LocaleKeys } from "./locales/en-US";

const locales: Record<string, typeof enUS> = {
  "en-US": enUS,
};

export function t(key: LocaleKeys, language: string | null): string {
  const locale = (language && locales[language]) || enUS;
  return locale[key];
}
