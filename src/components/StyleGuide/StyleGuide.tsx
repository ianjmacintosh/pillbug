import {
  Clipboard,
  CalendarCheck,
  Settings,
  Lock,
  Calendar,
  Pill,
  Bell,
  CheckCircle,
  Plus,
  Trash2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import "./StyleGuide.css";

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

const ICONS = [
  { name: "Pill", icon: <Pill size={24} aria-hidden="true" /> },
  {
    name: "CalendarCheck",
    icon: <CalendarCheck size={24} aria-hidden="true" />,
  },
  { name: "Settings", icon: <Settings size={24} aria-hidden="true" /> },
  { name: "Lock", icon: <Lock size={24} aria-hidden="true" /> },
  { name: "Calendar", icon: <Calendar size={24} aria-hidden="true" /> },
  { name: "Clipboard", icon: <Clipboard size={24} aria-hidden="true" /> },
  { name: "Bell", icon: <Bell size={24} aria-hidden="true" /> },
  {
    name: "CheckCircle",
    icon: <CheckCircle size={24} aria-hidden="true" />,
  },
  { name: "Plus", icon: <Plus size={24} aria-hidden="true" /> },
  { name: "Trash2", icon: <Trash2 size={24} aria-hidden="true" /> },
  { name: "LogOut", icon: <LogOut size={24} aria-hidden="true" /> },
  {
    name: "ChevronRight",
    icon: <ChevronRight size={24} aria-hidden="true" />,
  },
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
    value: "oklch(0.97 0.04 95)",
    role: "--color-surface-tinted",
  },
  {
    label: "Sky Blue",
    value: "oklch(0.50 0.22 249)",
    role: "--color-well-bg",
    light: true,
  },
  {
    label: "Sky Tint",
    value: "oklch(0.94 0.06 249)",
    role: "--color-well-bg-light",
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
          Warm Utilitarian · Coiny + Inter · OKLCH color · 4px grid
        </p>
      </header>

      <nav className="sg-nav" aria-label="Style guide sections">
        <a href="#color">Color</a>
        <a href="#typography">Typography</a>
        <a href="#buttons">Buttons</a>
        <a href="#wells">Wells</a>
        <a href="#icons">Icons</a>
        <a href="#spacing">Spacing</a>
      </nav>

      {/* ── Color ── */}
      <Section id="color" label="Color palette">
        <div className="sg-palette">
          {PALETTE.map(({ label, value, role }) => (
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
            <span className="sg-type-meta">Display · Coiny · 3rem · 400</span>
            <p className="sg-type-display">Prescriptions, organized.</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">h1 · Coiny · 2.25rem · 400</span>
            <h1 style={{ fontSize: "2.25rem" }}>Your medications today</h1>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">h2 · Coiny · 1.75rem · 400</span>
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
          warmth, less ubiquitous.
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
              Gold bg + warm-dark text. 6px bottom border + shadow gives the
              raised feel; hover depresses 4px. On white form panels, use dark
              bg instead.
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
            <p className="sg-button-note">
              Sky blue border + text, no fill. Same raised treatment — 6px
              bottom border, depresses on hover.
            </p>
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

          <div className="sg-button-group">
            <p className="sg-button-group-label">Icon (standalone)</p>
            <div className="sg-button-row">
              <button className="button-icon" aria-label="Add prescription">
                <Plus size={20} aria-hidden="true" />
              </button>
              <button className="button-icon" aria-label="Settings">
                <Settings size={20} aria-hidden="true" />
              </button>
              <button className="button-icon" disabled aria-label="Disabled">
                <Bell size={20} aria-hidden="true" />
              </button>
            </div>
            <p className="sg-button-note">
              48×48 icon-only button. Use <code>aria-label</code> when the icon
              is the only content. Same raised + depress treatment.
            </p>
          </div>

          <div className="sg-button-group">
            <p className="sg-button-group-label">Icon + text</p>
            <div className="sg-button-row">
              <button className="button-primary">
                <Plus size={18} aria-hidden="true" />
                Add prescription
              </button>
              <button className="button-secondary">
                <ChevronRight size={18} aria-hidden="true" />
                View details
              </button>
              <button className="button-danger">
                <Trash2 size={18} aria-hidden="true" />
                Delete
              </button>
            </div>
            <p className="sg-button-note">
              All button classes support icon children natively via{" "}
              <code>inline-flex + gap: 8px</code>. Use Lucide at{" "}
              <code>size={"{18}"}</code> for inline icons (vs 20–24 for
              standalone). Icon goes left of label by default; swap order for a
              trailing chevron.
            </p>
          </div>
        </div>
      </Section>

      {/* ── Wells ── */}
      <Section id="wells" label="Wells / callouts">
        <div className="sg-well-demos">
          <div className="well">
            <strong>Reminder set for 8:00 AM daily.</strong> You&apos;ll get a
            notification before each dose window.
          </div>
          <div className="sg-well-light">
            <strong>No prescriptions yet.</strong> Add your first prescription
            to get started with reminders.
          </div>
        </div>
        <p className="sg-icon-note" style={{ marginTop: "var(--space-4)" }}>
          Use <code>.well</code> for high-emphasis callouts: confirmations,
          onboarding nudges, system status. Sky blue + white text. The light
          variant (<code>.sg-well-light</code> →{" "}
          <code>--color-well-bg-light</code>) works for lower-emphasis info
          blocks.
        </p>
      </Section>

      {/* ── Icons ── */}
      <Section id="icons" label="Icons">
        <p className="sg-icon-note">
          Icon library: <strong>Lucide React</strong>.{" "}
          <code>import {"{ IconName }"} from &apos;lucide-react&apos;</code>.
          Stroke-based, 24px grid, <code>strokeWidth=2</code>,{" "}
          <code>strokeLinecap=&quot;round&quot;</code>. Pass{" "}
          <code>aria-hidden=&quot;true&quot;</code> on decorative icons; use{" "}
          <code>aria-label</code> when the icon is the only content of an
          interactive element.
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
          Lucide has 1,000+ icons — use any that fit. Tree-shakeable: only what
          you import ships in the bundle. MIT license.
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
