import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import enUS from "../../shared/locales/en-US";
import ptBR from "../../shared/locales/pt-BR";
import { supportedLngs, fallbackLng } from "./constants";

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

i18next.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18next;
