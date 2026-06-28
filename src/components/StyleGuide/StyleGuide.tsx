import "./StyleGuide.css";

function Swatch({
  label,
  value,
  textColor = "var(--color-text-primary)",
}: {
  label: string;
  value: string;
  textColor?: string;
}) {
  return (
    <div className="sg-swatch">
      <div className="sg-swatch-block" style={{ background: value }} />
      <div className="sg-swatch-meta">
        <div className="sg-swatch-name">{label}</div>
        <div className="sg-swatch-value" style={{ color: textColor }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="sg-section" id={id}>
      <p className="sg-section-label">{label}</p>
      {children}
    </section>
  );
}

function IconPrescriptions() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="11" y2="16" />
    </svg>
  );
}

function IconFillSession() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  );
}

function IconSettings() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg
      viewBox="0 0 16 18"
      width="16"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="8" width="14" height="10" rx="1.5" />
      <path d="M4 8V5.5a4 4 0 0 1 8 0V8" />
      <circle cx="8" cy="13" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="14" height="13" rx="1.5" />
      <path d="M5 1v3.5M11 1v3.5M1 7.5h14" />
      <path d="M5.5 11l2 2 3.5-3.5" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      viewBox="0 0 14 16"
      width="14"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 1.5H3.5A1.5 1.5 0 0 0 2 3v11a1.5 1.5 0 0 0 1.5 1.5h7A1.5 1.5 0 0 0 12 14V3a1.5 1.5 0 0 0-1.5-1.5H9" />
      <rect x="4.5" y="1" width="5" height="3" rx="1" />
      <path d="M5 8h4M5 11h2.5" />
    </svg>
  );
}

const ICONS = [
  { name: "Prescriptions", icon: <IconPrescriptions /> },
  { name: "Fill Session", icon: <IconFillSession /> },
  { name: "Settings", icon: <IconSettings /> },
  { name: "Lock", icon: <IconLock /> },
  { name: "Calendar", icon: <IconCalendar /> },
  { name: "Clipboard", icon: <IconClipboard /> },
];

const PALETTE = [
  {
    label: "Companion Gold",
    value: "oklch(0.9 0.4 95)",
    role: "--color-brand-bg",
  },
  {
    label: "Gold Action",
    value: "oklch(0.87 0.36 95)",
    role: "--color-action",
  },
  {
    label: "Gold Tint",
    value: "oklch(0.95 0.06 95)",
    role: "--color-surface-tinted",
  },
  {
    label: "Warm Dark",
    value: "oklch(0.22 0.04 60)",
    role: "--color-text-primary",
    light: true,
  },
  {
    label: "Olive Link",
    value: "oklch(0.42 0.1 55)",
    role: "--color-link",
    light: true,
  },
  {
    label: "Muted Text",
    value: "oklch(0.5 0 0)",
    role: "--color-text-muted",
    light: true,
  },
  {
    label: "Border",
    value: "oklch(0.7 0 0)",
    role: "--gray-70",
  },
  {
    label: "Off-white",
    value: "oklch(0.97 0 0)",
    role: "--gray-97",
  },
  {
    label: "Alert Red",
    value: "oklch(0.4 0.15 25)",
    role: "--color-error",
    light: true,
  },
  {
    label: "Danger",
    value: "oklch(0.55 0.22 25)",
    role: "button-danger bg",
    light: true,
  },
];

const SPACING = [
  { token: "--space-1", px: "4px", rem: "0.25rem" },
  { token: "--space-2", px: "8px", rem: "0.5rem" },
  { token: "--space-3", px: "12px", rem: "0.75rem" },
  { token: "--space-4", px: "16px", rem: "1rem" },
  { token: "--space-5", px: "20px", rem: "1.25rem" },
  { token: "--space-6", px: "24px", rem: "1.5rem" },
  { token: "--space-7", px: "28px", rem: "1.75rem" },
  { token: "--space-8", px: "32px", rem: "2rem" },
  { token: "--space-9", px: "40px", rem: "2.5rem" },
  { token: "--space-10", px: "48px", rem: "3rem" },
];

export function StyleGuide() {
  return (
    <main className="sg">
      <header className="sg-header">
        <h1>Pillbug Design System</h1>
        <p className="sg-header-sub">
          Warm Utilitarian · Lora + Inter · OKLCH color · 4px grid
        </p>
      </header>

      <nav className="sg-nav" aria-label="Style guide sections">
        <a href="#color">Color</a>
        <a href="#typography">Typography</a>
        <a href="#buttons">Buttons</a>
        <a href="#icons">Icons</a>
        <a href="#spacing">Spacing</a>
      </nav>

      {/* ── Color ── */}
      <Section id="color" label="Color palette">
        <div className="sg-palette">
          {PALETTE.map(({ label, value, role, light }) => (
            <div key={label} className="sg-swatch">
              <div
                className="sg-swatch-block"
                style={{ background: value }}
                aria-hidden="true"
              />
              <div className="sg-swatch-meta">
                <div className="sg-swatch-name">{label}</div>
                <div className="sg-swatch-token">{role}</div>
                <div className="sg-swatch-value">{value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="sg-color-note">
          All colors use{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch"
            target="_blank"
            rel="noreferrer"
          >
            OKLCH
          </a>{" "}
          — perceptually uniform, more vibrant on wide-gamut displays than HSL
          or hex.
        </div>
      </Section>

      {/* ── Typography ── */}
      <Section id="typography" label="Typography">
        <div className="sg-type-stack">
          <div className="sg-type-row">
            <span className="sg-type-meta">Display · Lora · 3rem · 700</span>
            <p className="sg-type-display">Prescriptions, organized.</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">h1 · Lora · 2.25rem · 700</span>
            <h1 style={{ fontSize: "2.25rem" }}>Your medications today</h1>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">h2 · Lora · 1.75rem · 600</span>
            <h2 style={{ fontSize: "1.75rem" }}>Add a prescription</h2>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">h3 · Inter · 1.25rem · 700</span>
            <h3 style={{ fontSize: "1.25rem" }}>Lisinopril 10mg</h3>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">Body · Inter · 1rem · 400</span>
            <p>
              Pillbug tracks your prescriptions and reminds you when it&apos;s
              time to take them — without filling your calendar with alarms you
              end up ignoring. Set it once, trust it daily.
            </p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">Small · Inter · 0.875rem · 400</span>
            <p
              style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}
            >
              Last taken: Thursday at 8:00 AM · Due in 14 hours
            </p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              Label · Inter · 0.75rem · 700 · uppercase
            </span>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "var(--color-text-muted)",
              }}
            >
              Next dose due
            </p>
          </div>
        </div>

        <div className="sg-font-note">
          <strong>Current:</strong> Inter (self-hosted).{" "}
          <strong>Approved next step:</strong> migrate to Instrument Sans — more
          warmth, less ubiquitous. Lora for h1/h2 is fixed; do not swap.
        </div>
      </Section>

      {/* ── Buttons ── */}
      <Section id="buttons" label="Buttons">
        <div className="sg-button-groups">
          <div className="sg-button-group">
            <p className="sg-button-group-label">Primary</p>
            <div className="sg-button-row">
              <button className="button-primary">Take medication</button>
              <button className="button-primary button-sm">Add +</button>
              <button className="button-primary" disabled>
                Disabled
              </button>
            </div>
            <p className="sg-button-note">
              Gold bg + warm-dark text. On white form panels, use dark bg
              instead.
            </p>
          </div>

          <div className="sg-button-group">
            <p className="sg-button-group-label">Secondary</p>
            <div className="sg-button-row">
              <button className="button-secondary">Skip dose</button>
              <button className="button-secondary button-sm">Cancel</button>
              <button className="button-secondary" disabled>
                Disabled
              </button>
            </div>
            <p className="sg-button-note">Border outline, no fill.</p>
          </div>

          <div className="sg-button-group">
            <p className="sg-button-group-label">Danger</p>
            <div className="sg-button-row">
              <button className="button-danger">Delete prescription</button>
              <button className="button-danger button-sm">Remove</button>
              <button className="button-danger" disabled>
                Disabled
              </button>
            </div>
            <p className="sg-button-note">
              Muted red, white text. Destructive actions only.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Icons ── */}
      <Section id="icons" label="Icons">
        <p className="sg-icon-note">
          All inline SVGs — no library. 24×24 viewBox, stroke-based,{" "}
          <code>strokeWidth=&quot;2&quot;</code>,{" "}
          <code>strokeLinecap=&quot;round&quot;</code>,{" "}
          <code>aria-hidden=&quot;true&quot;</code>.
        </p>
        <div className="sg-icon-grid">
          {ICONS.map(({ name, icon }) => (
            <div key={name} className="sg-icon-item">
              <span className="sg-icon-glyph">{icon}</span>
              <span className="sg-icon-name">{name}</span>
            </div>
          ))}
        </div>
        <p className="sg-icon-note" style={{ marginTop: "1rem" }}>
          Do not add an icon library without an explicit decision. The current
          set covers all production use cases.
        </p>
      </Section>

      {/* ── Spacing ── */}
      <Section id="spacing" label="Spacing">
        <p className="sg-spacing-note">
          4px base unit. All spacing from the <code>--space-*</code> token
          scale.
        </p>
        <div className="sg-spacing-list">
          {SPACING.map(({ token, px, rem }) => (
            <div key={token} className="sg-spacing-row">
              <div
                className="sg-spacing-block"
                style={{ width: px }}
                aria-hidden="true"
              />
              <code className="sg-spacing-token">{token}</code>
              <span className="sg-spacing-values">
                {px} / {rem}
              </span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}

export default StyleGuide;
