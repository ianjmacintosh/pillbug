import { useTranslation } from "react-i18next";

function Terms() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t("terms.heading")}</h1>
      <p>{t("terms.placeholder")}</p>
    </main>
  );
}

export default Terms;
