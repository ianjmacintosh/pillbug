import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [terms, setTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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
      body: JSON.stringify({ email }),
    });

    if (res.ok) {
      await navigate({ to: "/check-your-email" });
    } else {
      const data = (await res.json()) as { error: string };
      setError(
        data.error === "email_taken"
          ? "An account with this email already exists. Try logging in instead."
          : "Something went wrong. Please try again.",
      );
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
        <label>
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          I agree to the Terms of Service
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
