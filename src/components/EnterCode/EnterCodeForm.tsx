import { useState, useEffect, useRef } from "react";
import { useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { Field } from "../Field/Field";

type ErrorCode = "invalid" | "expired" | "used" | "locked";

export function EnterCodeForm() {
  const { t } = useTranslation();
  const { token, pin: urlPin } = useSearch({ strict: false }) as {
    token?: string;
    pin?: string;
  };
  const [pin, setPin] = useState(urlPin ?? "");
  const [error, setError] = useState<ErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(!!urlPin);
  const autoSubmitted = useRef(false);

  useEffect(() => {
    if (!urlPin || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void fetch("/api/v1/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pin: urlPin }),
    }).then(async (res) => {
      if (res.ok) {
        window.location.replace("/");
        return;
      }
      const body = (await res.json()) as { error: ErrorCode };
      setError(body.error);
      setSubmitting(false);
    });
    // token and urlPin come from the URL on mount and never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/auth/verify-pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, pin }),
    });

    if (res.ok) {
      window.location.replace("/");
      return;
    }

    const body = (await res.json()) as { error: ErrorCode };
    setError(body.error);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <Field
        label={t("enterCode.codeLabel")}
        type="text"
        inputMode="numeric"
        pattern="[0-9]{4}"
        maxLength={4}
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
        required
        autoComplete="one-time-code"
      />
      {error && (
        <p role="alert">
          {t(`enterCode.error.${error}`)}{" "}
          <a href="/login">{t("enterCode.requestNewCode")}</a>.
        </p>
      )}
      <Button
        type="submit"
        disabled={submitting || pin.length !== 4}
        className="button-primary"
      >
        {submitting ? t("enterCode.submitting") : t("enterCode.submit")}
      </Button>
    </form>
  );
}
