import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enUS from "../../shared/locales/en-US";
import ptBR from "../../shared/locales/pt-BR";

i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-US": { translation: enUS },
      "pt-BR": { translation: ptBR },
    },
    supportedLngs: ["en-US", "pt-BR"],
    fallbackLng: "en-US",
    interpolation: { escapeValue: false },
  });

export default i18next;
