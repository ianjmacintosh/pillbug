import { useTranslation } from "react-i18next";
import "./Footer.css";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <nav className="footer-inner" aria-label="Legal">
        <a href="/terms">{t("footer.termsOfService")}</a>
        <a href="/privacy">{t("footer.privacyPolicy")}</a>
      </nav>
    </footer>
  );
}

export default Footer;
