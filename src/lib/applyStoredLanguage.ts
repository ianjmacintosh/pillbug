import i18next, { fallbackLng, supportedLngs } from "./i18n";
import { resolveLanguage } from "./resolveLanguage";

export async function applyStoredLanguage(language: string | null) {
  const target =
    language ?? resolveLanguage(navigator.language, supportedLngs, fallbackLng);
  await i18next.changeLanguage(target);
}
