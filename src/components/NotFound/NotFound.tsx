import { useTranslation } from "react-i18next";

function NotFound() {
  const { t } = useTranslation();
  return (
    <main>
      <h1>{t("notFound.heading")}</h1>
    </main>
  );
}

export default NotFound;
