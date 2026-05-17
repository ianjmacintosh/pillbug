import { useState } from "react";
import "./Prescriptions.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  startDate: string;
  endDate: string | null;
  instructions: string | null;
  status: string;
}

function Prescriptions() {
  const [revealed, setRevealed] = useState(false);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [drugName, setDrugName] = useState("");
  const [dosage, setDosage] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleReveal() {
    const res = await fetch("/api/v1/prescriptions");
    if (res.ok) {
      const data = (await res.json()) as Prescription[];
      setPrescriptions(data);
      setRevealed(true);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/v1/prescriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        drugName,
        dosage,
        schedule: { days: "daily", times: [], timezoneMode: "local" },
        startDate,
        endDate: endDate || null,
        instructions: instructions || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as Prescription;
      setDrugName("");
      setDosage("");
      setStartDate("");
      setEndDate("");
      setInstructions("");
      if (revealed) {
        setPrescriptions((prev) => [created, ...prev]);
      }
    } else {
      const data = (await res.json()) as { error: string };
      setError(data.error);
    }

    setSubmitting(false);
  }

  return (
    <main>
      <h1>Prescriptions</h1>

      <section>
        <h2>Add prescription</h2>
        <form onSubmit={handleCreate}>
          {error && <p role="alert">{error}</p>}
          <label>
            Drug name
            <input
              type="text"
              value={drugName}
              onChange={(e) => setDrugName(e.target.value)}
              required
            />
          </label>
          <label>
            Dosage
            <input
              type="text"
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              required
            />
          </label>
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label>
            End date (optional)
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Instructions (optional)
            <input
              type="text"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="button-primary"
          >
            {submitting ? "Saving…" : "Add prescription"}
          </button>
        </form>
      </section>

      <section>
        <h2>Your prescriptions</h2>
        {!revealed ? (
          <button type="button" onClick={handleReveal}>
            Show all prescriptions
          </button>
        ) : prescriptions.length === 0 ? (
          <p>No active prescriptions.</p>
        ) : (
          <ul>
            {prescriptions.map((p) => (
              <li key={p.id}>
                <strong>{p.drugName}</strong> — {p.dosage}
                {p.instructions && <span> ({p.instructions})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default Prescriptions;
