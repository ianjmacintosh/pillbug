import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import "./CompleteSetup.css";

function CompleteSetup() {
  const { t, i18n } = useTranslation();
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
        body: JSON.stringify({ timezone, language: i18n.language }),
      });
      setLoading(false);
      if (res.ok) {
        navigate({ to: "/" });
      } else {
        setErrorMessage(await res.text());
      }
    }
    run();
  }, [navigate, retryCount, i18n.language]);

  return (
    <main className="finish-setup">
      {loading && <p role="status">{t("completeSetup.loading")}</p>}
      {errorMessage !== null && (
        <div role="alert">
          <p>{t("completeSetup.errorHeading")}</p>
          <pre>{errorMessage}</pre>
          <Button
            type="button"
            variant="primary"
            onClick={() => setRetryCount((c) => c + 1)}
          >
            {t("completeSetup.retry")}
          </Button>
        </div>
      )}
    </main>
  );
}

export default CompleteSetup;
