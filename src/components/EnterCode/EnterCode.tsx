import { useTranslation } from "react-i18next";
import { EnterCodeForm } from "./EnterCodeForm";

function EnterCode() {
  const { t } = useTranslation();

  return (
    <main>
      <h1>{t("enterCode.heading")}</h1>
      <EnterCodeForm />
    </main>
  );
}

export default EnterCode;
