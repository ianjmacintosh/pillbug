import { useTranslation } from "react-i18next";

function Privacy() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t("privacy.heading")}</h1>
      <p>{t("privacy.placeholder")}</p>
    </main>
  );
}

export default Privacy;
