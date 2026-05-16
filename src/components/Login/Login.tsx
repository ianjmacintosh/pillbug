import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);

    await fetch("/api/v1/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
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
