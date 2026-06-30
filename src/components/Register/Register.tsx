import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Lock, CalendarCheck, ClipboardList } from "lucide-react";
import { RegistrationForm } from "./RegistrationForm";
import "./Register.css";

function Register() {
  const { t, i18n } = useTranslation();

  return (
    <main className="register">
      <p className="register-hero-text" lang={i18n.language}>
        <span>{t("register.heroLine1")}</span>
        <span>{t("register.heroLine2")}</span>
      </p>
      <section className="register-card">
        <h2>{t("register.heading")}</h2>
        <div className="register-divider" aria-hidden="true" />
        <p className="register-intro">{t("register.intro")}</p>
        <ul className="register-features">
          <li className="register-feature">
            <span className="register-feature-icon">
              <Lock size={16} aria-hidden="true" />
            </span>
            <div className="register-feature-copy">
              <strong className="register-feature-title">
                {t("register.feature1Title")}
              </strong>
              <span className="register-feature-desc">
                {t("register.feature1Desc")}
              </span>
            </div>
          </li>
          <li className="register-feature">
            <span className="register-feature-icon">
              <CalendarCheck size={16} aria-hidden="true" />
            </span>
            <div className="register-feature-copy">
              <strong className="register-feature-title">
                {t("register.feature2Title")}
              </strong>
              <span className="register-feature-desc">
                {t("register.feature2Desc")}
              </span>
            </div>
          </li>
          <li className="register-feature">
            <span className="register-feature-icon">
              <ClipboardList size={16} aria-hidden="true" />
            </span>
            <div className="register-feature-copy">
              <strong className="register-feature-title">
                {t("register.feature3Title")}
              </strong>
              <span className="register-feature-desc">
                {t("register.feature3Desc")}
              </span>
            </div>
          </li>
        </ul>
        <div className="register-form-divider" aria-hidden="true" />
        <RegistrationForm />
        <p className="register-login-link">
          {t("register.alreadyHaveAccount")}{" "}
          <Link to="/login">{t("register.logIn")}</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
