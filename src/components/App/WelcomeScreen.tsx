import "./WelcomeScreen.css";

export function WelcomeScreen() {
  return (
    <main className="welcome">
      <div className="welcome-content">
        <p className="welcome-icon" aria-hidden="true">
          💊
        </p>
        <h1>Welcome to Pillbug</h1>
        <p className="welcome-subtitle">
          Your medication tracker is ready. Here's how it works:
        </p>
        <ol className="welcome-steps">
          <li>
            <span className="welcome-step-num">1</span>
            <div>
              <strong>Add your medications</strong>
              <p>Enter what you take — name, dosage, and dose form.</p>
            </div>
          </li>
          <li>
            <span className="welcome-step-num">2</span>
            <div>
              <strong>Set your schedule</strong>
              <p>Say when you take each one: morning, evening, or as needed.</p>
            </div>
          </li>
          <li>
            <span className="welcome-step-num">3</span>
            <div>
              <strong>Track your doses</strong>
              <p>
                Check each one off as you go. Your weekly schedule lives here.
              </p>
            </div>
          </li>
        </ol>
        <a href="/prescriptions/new" className="button-primary welcome-cta">
          Add your first medication
        </a>
      </div>
    </main>
  );
}
