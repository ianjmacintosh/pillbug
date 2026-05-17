import { useState, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import VerifyError from "../VerifyError";

function Verify() {
  const { token } = useSearch({ strict: false }) as { token?: string };
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function verify() {
      const res = await fetch(`/api/v1/auth/verify?token=${token ?? ""}`);
      if (res.ok) {
        await navigate({ to: "/" });
      } else {
        setFailed(true);
      }
    }
    verify();
  }, [token, navigate]);

  if (failed) return <VerifyError />;

  return (
    <main>
      <p>Verifying…</p>
    </main>
  );
}

export default Verify;
