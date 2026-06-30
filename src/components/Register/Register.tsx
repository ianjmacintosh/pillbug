import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RegistrationForm } from "./RegistrationForm";
import "./Register.css";

function IconLock() {
  return (
    <svg
      viewBox="0 0 16 18"
      width="14"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="8" width="14" height="10" rx="1.5" />
      <path d="M4 8V5.5a4 4 0 0 1 8 0V8" />
      <circle cx="8" cy="13" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="14" height="13" rx="1.5" />
      <path d="M5 1v3.5M11 1v3.5M1 7.5h14" />
      <path d="M5.5 11l2 2 3.5-3.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      viewBox="0 0 14 16"
      width="13"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 1.5H3.5A1.5 1.5 0 0 0 2 3v11a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 12 14V3a1.5 1.5 0 0 0-1.5-1.5H9" />
      <rect x="4.5" y="1" width="5" height="3" rx="1" />
      <path d="M5 8h4M5 11h2.5" />
    </svg>
  );
}

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
              <IconLock />
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
              <IconCalendar />
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
              <IconClipboard />
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
