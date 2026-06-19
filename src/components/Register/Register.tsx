import { useTranslation } from "react-i18next";
import { RegistrationForm } from "./RegistrationForm";
import "./Register.css";

function Register() {
  const { t } = useTranslation();

  return (
    <main className="register">
      <h1>{t("register.heading")}</h1>
      <p className="register-intro">{t("register.intro")}</p>
      <RegistrationForm />
      <p>
        {t("register.alreadyHaveAccount")}{" "}
        <a href="/login">{t("register.logIn")}</a>
      </p>
    </main>
  );
}

export default Register;
