import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Turnstile } from "@marsidev/react-turnstile";
import "./Login.css";

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string;

function Login() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, turnstileToken }),
    });

    await navigate({ to: "/check-your-email" });
  }

  return (
    <main className="login">
      <h1>Log in</h1>
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
        <Turnstile
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={(token) => {
            setTurnstileToken(token);
            setTurnstileError(false);
          }}
          onError={() => setTurnstileError(true)}
          onExpire={() => setTurnstileToken(null)}
        />
        {turnstileError && (
          <p role="alert">
            Security check failed. Please reload the page and try again.
          </p>
        )}
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? "Sending…" : "Send magic link"}
        </button>
      </form>
      <p>
        New here? <a href="/register">Create an account</a>
      </p>
    </main>
  );
}

export default Login;
