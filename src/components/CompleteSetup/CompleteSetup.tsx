import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import "./CompleteSetup.css";

function CompleteSetup() {
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
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
    run();
  }, [navigate, retryCount]);

  return (
    <main className="finish-setup">
      {loading && <p role="status">Setting up your account…</p>}
      {errorMessage !== null && (
        <div role="alert">
          <p>Error Details</p>
          <pre>{errorMessage}</pre>
          <button onClick={() => setRetryCount((c) => c + 1)}>Retry</button>
        </div>
      )}
    </main>
  );
}

export default CompleteSetup;
