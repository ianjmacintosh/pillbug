import { useTranslation } from "react-i18next";
import { EnterCodeForm } from "./EnterCodeForm";
import "./EnterCode.css";

function EnterCode() {
  const { t } = useTranslation();

  return (
    <main className="enter-code">
      <h1>{t("enterCode.heading")}</h1>
      <p className="enter-code-intro">{t("enterCode.intro")}</p>
      <EnterCodeForm />
    </main>
  );
}

export default EnterCode;
