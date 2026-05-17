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
  const [formOpen, setFormOpen] = useState(false);
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

  function handleHide() {
    setPrescriptions([]);
    setRevealed(false);
  }

  function handleOpenForm() {
    setError(null);
    setFormOpen(true);
  }

  function handleCancel() {
    setDrugName("");
    setDosage("");
    setStartDate("");
    setEndDate("");
    setInstructions("");
    setError(null);
    setFormOpen(false);
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
      if (revealed) {
        setPrescriptions((prev) => [created, ...prev]);
      }
      handleCancel();
    } else {
      const data = (await res.json()) as { error: string };
      setError(data.error);
    }

    setSubmitting(false);
  }

  return (
    <main className="prescriptions">
      <h1>Prescriptions</h1>

      <section>
        <h2>Your prescriptions</h2>
        {!revealed ? (
          <button
            type="button"
            onClick={handleReveal}
            className="button-secondary"
          >
            Show all prescriptions
          </button>
        ) : prescriptions.length === 0 ? (
          <>
            <p>No active prescriptions.</p>
            <button
              type="button"
              onClick={handleHide}
              className="button-secondary"
            >
              Hide
            </button>
          </>
        ) : (
          <>
            <table className="prescription-list">
              <thead>
                <tr>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Drug Name</th>
                  <th>Dosage</th>
                </tr>
              </thead>
              <tbody>
                {prescriptions.map((p) => (
                  <tr key={p.id}>
                    <td>{p.startDate}</td>
                    <td>{p.endDate ?? "—"}</td>
                    <td>{p.drugName}</td>
                    <td>{p.dosage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              onClick={handleHide}
              className="button-secondary"
            >
              Hide
            </button>
          </>
        )}
      </section>

      <section>
        {!formOpen ? (
          <button
            type="button"
            onClick={handleOpenForm}
            className="button-primary"
          >
            Add prescription
          </button>
        ) : (
          <>
            <h2>Add prescription</h2>
            <form onSubmit={handleCreate}>
              {error && <p role="alert">{error}</p>}

              <div className="field">
                <label htmlFor="drugName">Drug name</label>
                <input
                  id="drugName"
                  type="text"
                  value={drugName}
                  onChange={(e) => setDrugName(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="dosage">Dosage</label>
                <input
                  id="dosage"
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  required
                />
              </div>

              <div className="date-fields">
                <div className="field">
                  <label htmlFor="startDate">Start date</label>
                  <input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="endDate">End date (optional)</label>
                  <input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="instructions">Instructions (optional)</label>
                <input
                  id="instructions"
                  type="text"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  disabled={submitting}
                  className="button-primary"
                >
                  {submitting ? "Saving…" : "Save prescription"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default Prescriptions;
