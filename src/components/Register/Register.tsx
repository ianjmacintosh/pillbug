import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslation } from "react-i18next";
import "./Register.css";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
const TURNSTILE_INTERACTIVE_SITE_KEY = "3x00000000000000000000FF";

function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const forceChallenge = new URLSearchParams(window.location.search).has(
    "challenge",
  );
  const siteKey = forceChallenge
    ? TURNSTILE_INTERACTIVE_SITE_KEY
    : TURNSTILE_SITE_KEY;
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!terms) {
      setError(t("register.termsError"));
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        turnstileToken,
        language: i18n.language,
      }),
    });

    if (res.ok) {
      const { token } = (await res.json()) as { token: string };
      await navigate({ to: "/enter-code", search: { token } });
    } else {
      setError(t("register.serverError"));
      setSubmitting(false);
    }
  }

  return (
    <main className="register">
      <div className="register-story">
        <p className="register-eyebrow">Pillbug</p>
        <h2 className="register-headline">{t("register.pitch.headline")}</h2>
        <ul className="register-features">
          <li className="register-feature">
            <strong>{t("register.pitch.weekAtAGlanceLabel")}</strong>{" "}
            {t("register.pitch.weekAtAGlance")}
          </li>
          <li className="register-feature">
            <strong>{t("register.pitch.confirmAsYouGoLabel")}</strong>{" "}
            {t("register.pitch.confirmAsYouGo")}
          </li>
          <li className="register-feature">
            <strong>{t("register.pitch.guidedRefillsLabel")}</strong>{" "}
            {t("register.pitch.guidedRefills")}
          </li>
        </ul>
      </div>

      <div className="register-form-col">
        <div className="register-card">
          <h1>{t("register.heading")}</h1>
          <form onSubmit={handleSubmit}>
            <label className="email-field">
              {t("register.emailLabel")}
              <input
                type="email"
                autoCorrect="on"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <Turnstile
              siteKey={siteKey}
              onSuccess={(token) => {
                setTurnstileToken(token);
                setTurnstileError(false);
              }}
              onError={() => setTurnstileError(true)}
              onExpire={() => setTurnstileToken(null)}
            />
            {turnstileError && (
              <p role="alert">{t("register.turnstileError")}</p>
            )}
            <label className="terms-field">
              <input
                id="terms-checkbox"
                type="checkbox"
                checked={terms}
                onChange={(e) => setTerms(e.target.checked)}
              />
              <span>
                {t("register.iAgreeToThe")}{" "}
                <a href="/terms">{t("register.termsOfService")}</a>{" "}
                {t("register.and")}{" "}
                <a href="/privacy">{t("register.privacyPolicy")}</a>
              </span>
            </label>
            {error && <p role="alert">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="button-primary"
            >
              {submitting ? t("register.submitting") : t("register.submit")}
            </button>
          </form>
        </div>
        <p className="rv1-login">
          {t("register.alreadyHaveAccount")}{" "}
          <a href="/login">{t("register.logIn")}</a>
        </p>
      </div>
    </main>
  );
}

export default Register;
