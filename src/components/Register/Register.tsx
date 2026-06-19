import { useTranslation } from "react-i18next";
import { RegistrationForm } from "./RegistrationForm";
import "./Register.css";

function Register() {
  const { t } = useTranslation();

  return (
    <main className="register">
      <div className="register-content">
        <h1>{t("register.heading")}</h1>
        <p className="register-intro">{t("register.intro")}</p>
        <ul className="register-features">
          <li>{t("register.feature1")}</li>
          <li>{t("register.feature2")}</li>
        </ul>
      </div>
      <div className="register-form-panel">
        <div className="register-form-card">
          <RegistrationForm />
        </div>
        <p className="register-login-link">
          {t("register.alreadyHaveAccount")}{" "}
          <a href="/login">{t("register.logIn")}</a>
        </p>
      </div>
    </main>
  );
}

export default Register;
