function Privacy() {
  return (
    <main className="prose">
      <h1>Privacy Policy</h1>
      <p>
        We take your rights to privacy extremely seriously and appreciate you
        trusting us with your data.
      </p>
      <p>
        In order to provide useful info for you and authenticate your identity,
        Pillbug needs to collect some personal information:
      </p>
      <ul>
        <li>Email address</li>
        <li>
          Medicines you take, including
          <ul>
            <li>Name</li>
            <li>Strength</li>
            <li>Form (tablet, capsule, etc)</li>
            <li>Dosage schedule and dose history</li>
          </ul>
        </li>
        <li>Time zone</li>
        <li>Preferred language</li>
      </ul>
      <p>
        Some or all of this data will be shared with our infrastructure
        providers:
      </p>
      <ul>
        <li>Cloudflare</li>
        <li>Resend</li>
        <li>Simple Analytics</li>
      </ul>
      <p>
        In order to protect our users' data, Pillbug performs regular backups of
        its database that includes this information.
      </p>
      <p>
        As a user, you reserve the right to delete your account and all records
        associated with it at any time.
      </p>
      <p>
        Pillbug maintains database backups for up to 30 days. In the event of a
        restore from backup, residual data may temporarily reappear before being
        removed again.
      </p>
      <p>
        <em>This Privacy Policy was last updated June 25, 2026</em>
      </p>
    </main>
  );
}

export default Privacy;
