import enUS, { type LocaleKeys } from "./locales/en-US";
import ptBR from "./locales/pt-BR";

const locales: Record<string, Record<LocaleKeys, string>> = {
  "en-US": enUS,
  "pt-BR": ptBR,
};

export function t(key: LocaleKeys, language: string | null): string {
  const locale = (language && locales[language]) || enUS;
  return locale[key];
}
