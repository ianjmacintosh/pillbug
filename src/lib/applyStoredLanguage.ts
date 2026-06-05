import i18next from "./i18n";

export async function applyStoredLanguage(language: string | null) {
  await i18next.changeLanguage(language ?? "en-US");
}
