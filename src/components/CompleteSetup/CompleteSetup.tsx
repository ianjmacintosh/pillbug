import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";
import "./CompleteSetup.css";

const Route = getRouteApi("/layout/finish-setup");

function CompleteSetup() {
  const { timezone: savedTimezone } = Route.useLoaderData();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selected, setSelected] = useState(savedTimezone ?? browserTimezone);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const allZones = Intl.supportedValuesOf("timeZone");

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    const res = await fetch("/api/v1/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: selected }),
    });
    setSubmitting(false);
    if (res.ok) {
      await navigate({ to: "/" });
    } else {
      setStatus("error");
    }
  }

  return (
    <main className="finish-setup">
      <h1>Set your time zone</h1>
      <p>
        Pillbug uses your time zone to schedule dose reminders at the right
        time. Confirm your time zone below to get started.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="timezone">Time zone</label>
          <select
            id="timezone"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {allZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        {status === "error" && (
          <p role="alert">Something went wrong. Please try again.</p>
        )}
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? "Saving…" : "Save"}
        </button>
      </form>
    </main>
  );
}

export default CompleteSetup;
