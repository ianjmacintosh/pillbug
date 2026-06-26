import { useTranslation } from "react-i18next";
import "./Footer.css";

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

function Footer() {
  const { t, i18n } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-legal" aria-label="Legal">
          <a href="/terms">{t("footer.termsOfService")}</a>
          <a href="/privacy">{t("footer.privacyPolicy")}</a>
        </nav>
        <label className="footer-language">
          <span>{t("footer.language")}</span>
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </footer>
  );
}

export default Footer;
