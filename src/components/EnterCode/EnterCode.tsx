import { useState, useEffect, useRef } from "react";
import { useSearch } from "@tanstack/react-router";

type ErrorCode = "invalid" | "expired" | "used" | "locked";

const ERROR_MESSAGES: Record<ErrorCode, string> = {
  invalid: "That login code has expired, please request a new one.",
  expired: "That login code has expired, please request a new one.",
  used: "This code has already been used.",
  locked: "Too many incorrect attempts. This code is locked.",
};

function EnterCode() {
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
    <main>
      <h1>Enter your code</h1>
      <form onSubmit={handleSubmit}>
        <label>
          4-digit code
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            required
            autoComplete="one-time-code"
          />
        </label>
        {error && (
          <p role="alert">
            {ERROR_MESSAGES[error]} <a href="/login">Request a new code</a>.
          </p>
        )}
        <button type="submit" disabled={submitting || pin.length !== 4}>
          {submitting ? "Verifying…" : "Verify"}
        </button>
      </form>
    </main>
  );
}

export default EnterCode;
