import { useTranslation } from "react-i18next";
import "./Footer.css";

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

function Footer({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t, i18n } = useTranslation();

  return (
    <footer className="footer">
      <div className="footer-inner">
        <nav className="footer-legal" aria-label="Legal">
          <span className="footer-eyebrow">{t("footer.legal")}</span>
          <a href="/terms">{t("footer.termsOfService")}</a>
          <a href="/privacy">{t("footer.privacyPolicy")}</a>
        </nav>
      </div>
      {!isAuthenticated && (
        <div className="footer-language">
          <div className="footer-language-inner">
            <label className="footer-eyebrow" htmlFor="footer-language-select">
              {t("footer.language")}
            </label>
            <select
              id="footer-language-select"
              value={i18n.language}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
            >
              {LANGUAGE_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
