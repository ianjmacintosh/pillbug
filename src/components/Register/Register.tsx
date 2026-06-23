import { useTranslation } from "react-i18next";
import { RegistrationForm } from "./RegistrationForm";
import "./Register.css";

function Register() {
  const { t } = useTranslation();

  return (
    <main className="register">
      <section className="register-content">
        <h1>{t("register.heading")}</h1>
        <p className="register-intro">{t("register.intro")}</p>
        <ul className="register-features">
          <li>{t("register.feature1")}</li>
          <li>{t("register.feature2")}</li>
        </ul>
      </section>
      <section className="register-form-panel">
        <RegistrationForm />
        <p className="register-login-link">
          {t("register.alreadyHaveAccount")}{" "}
          <a href="/login">{t("register.logIn")}</a>
        </p>
      </section>
    </main>
  );
}

export default Register;
