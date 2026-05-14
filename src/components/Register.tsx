import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;
const TURNSTILE_INTERACTIVE_SITE_KEY = "3x00000000000000000000FF";

function Register() {
  const navigate = useNavigate();
  const forceChallenge = new URLSearchParams(window.location.search).has(
    "challenge",
  );
  const siteKey = forceChallenge
    ? TURNSTILE_INTERACTIVE_SITE_KEY
    : TURNSTILE_SITE_KEY;
  const [email, setEmail] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!terms) {
      setError("You must accept the Terms of Service to register.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken }),
    });

    if (res.ok) {
      await navigate({ to: "/check-your-email" });
    } else {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <main>
      <h1>Create your account</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <Turnstile siteKey={siteKey} onSuccess={setTurnstileToken} />
        <label>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          I agree to the <a href="/terms">Terms of Service</a> and{" "}
          <a href="/privacy">Privacy Policy</a>
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send magic link"}
        </button>
      </form>
      <p>
        Already have an account? <a href="/login">Log in</a>
      </p>
    </main>
  );
}

export default Register;
