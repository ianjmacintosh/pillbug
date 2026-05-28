import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import "./CompleteSetup.css";

function CompleteSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function patch() {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setLoading(true);
    setErrorMessage(null);
    const res = await fetch("/api/v1/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    });
    setLoading(false);
    if (res.ok) {
      navigate({ to: "/" });
    } else {
      setErrorMessage(await res.text());
    }
  }

  useEffect(() => {
    patch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="finish-setup">
      {loading && <p role="status">Setting up your account…</p>}
      {errorMessage !== null && (
        <div role="alert">
          <p>Error Details</p>
          <pre>{errorMessage}</pre>
          <button onClick={patch}>Retry</button>
        </div>
      )}
    </main>
  );
}

export default CompleteSetup;
