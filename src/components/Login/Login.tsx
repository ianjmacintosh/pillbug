import { useTranslation } from "react-i18next";
import { LoginForm } from "./LoginForm";
import "./Login.css";

function Login() {
  const { t } = useTranslation();

  return (
    <main className="login">
      <h1>{t("login.heading")}</h1>
      <LoginForm />
      <p>
        {t("login.newHere")} <a href="/register">{t("login.createAccount")}</a>
      </p>
    </main>
  );
}

export default Login;
