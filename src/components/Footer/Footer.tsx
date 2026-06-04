import { useTranslation } from "react-i18next";
import "./Footer.css";

function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="footer">
      <a href="/terms">{t("footer.termsOfService")}</a>
      <a href="/privacy">{t("footer.privacyPolicy")}</a>
    </footer>
  );
}

export default Footer;
