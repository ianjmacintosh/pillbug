import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import { Field } from "../Field/Field";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
const TURNSTILE_INTERACTIVE_SITE_KEY = "3x00000000000000000000FF";

export function RegistrationForm() {
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
    <form onSubmit={handleSubmit}>
      <Field
        label={t("register.emailLabel")}
        className="email-field"
        type="email"
        autoCorrect="on"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Turnstile
        siteKey={siteKey}
        onSuccess={(token) => {
          setTurnstileToken(token);
          setTurnstileError(false);
        }}
        onError={() => setTurnstileError(true)}
        onExpire={() => setTurnstileToken(null)}
      />
      {turnstileError && <p role="alert">{t("register.turnstileError")}</p>}
      <Checkbox
        className="terms-field"
        checked={terms}
        onChange={(e) => setTerms(e.target.checked)}
      >
        {t("register.iAgreeToThe")}{" "}
        <a href="/terms">{t("register.termsOfService")}</a> {t("register.and")}{" "}
        <a href="/privacy">{t("register.privacyPolicy")}</a>
      </Checkbox>
      {error && <p role="alert">{error}</p>}
      <Button type="submit" disabled={submitting} className="button-primary">
        {submitting ? t("register.submitting") : t("register.submit")}
      </Button>
    </form>
  );
}
