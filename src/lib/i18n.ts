import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enUS from "../../shared/locales/en-US";
import ptBR from "../../shared/locales/pt-BR";

export const supportedLngs = ["en-US", "pt-BR"] as const;
export const fallbackLng = "en-US" as const;

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-US": { translation: enUS },
      "pt-BR": { translation: ptBR },
    },
    supportedLngs: [...supportedLngs],
    fallbackLng,
    interpolation: { escapeValue: false },
  });

export default i18next;
