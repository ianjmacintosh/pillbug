import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslation } from "react-i18next";
import "./Login.css";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    const res = await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), turnstileToken }),
    });

    const { token } = (await res.json()) as { token: string };
    await navigate({ to: "/enter-code", search: { token } });
  }

  return (
    <main className="login">
      <h1>{t("login.heading")}</h1>
      <form onSubmit={handleSubmit}>
        <label>
          {t("login.emailLabel")}
          <input
            type="email"
            autoCorrect="on"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setTurnstileError(false);
          }}
          onError={() => setTurnstileError(true)}
          onExpire={() => setTurnstileToken(null)}
        />
        {turnstileError && <p role="alert">{t("login.turnstileError")}</p>}
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
      <p>
        {t("login.newHere")} <a href="/register">{t("login.createAccount")}</a>
      </p>
    </main>
  );
}

export default Login;
