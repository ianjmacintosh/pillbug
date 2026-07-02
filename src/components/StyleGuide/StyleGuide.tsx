import { useCallback, useRef, useState } from "react";
import {
  Clipboard,
  CalendarCheck,
  Settings,
  Lock,
  Calendar,
  Pill,
  Bell,
  CheckCircle,
  ClipboardPlus,
  Plus,
  Trash2,
  LogOut,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "../Button/Button";
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

function SoftDisabledDemo() {
  const [hint, setHint] = useState<string | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showHint = useCallback(() => {
    setHint("Still needed: drug name, dosing days");
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), 4000);
  }, []);

  return (
    <div className="sg-button-group">
      <p className="sg-button-group-label">Soft disabled (blocked)</p>
      <div
        className="sg-button-row"
        style={{ flexWrap: "wrap", gap: "0.75rem" }}
      >
        {hint && (
          <p
            style={{
              width: "100%",
              margin: 0,
              fontSize: "var(--text-sm)",
              color: "var(--color-text-muted)",
              textAlign: "center",
            }}
            role="status"
          >
            {hint}
          </p>
        )}
        {(["button-primary", "button-secondary", "button-danger"] as const).map(
          (variant) => (
            <Button
              key={variant}
              disabled
              onDisabledClick={showHint}
              className={variant}
            >
              Save prescription
            </Button>
          ),
        )}
      </div>
      <p className="sg-button-note">
        Pass <code>onDisabledClick</code> to <code>Button</code> instead of
        using the native <code>disabled</code> attribute. The button stays
        focusable and tabbable; clicking it triggers a partial press (2px
        instead of 4px) + shake animation and calls the callback. The caller
        shows an inline hint explaining what&apos;s needed.
      </p>
    </div>
  );
}

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
        <a href="#motif">Motif</a>
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
            <span className="sg-type-meta">
              --text-hero · clamp(3rem, 12.5vw, 8rem) · Coiny · 400 · Register
              hero only
            </span>
            <p className="sg-type-hero">Take your meds.</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-display · 3rem · Coiny · 400
            </span>
            <p className="sg-type-display">Prescriptions, organized.</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-h1 · 2.25rem · Coiny · 400
            </span>
            <h1>Your medications today</h1>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-h2 · 1.75rem · Coiny · 400
            </span>
            <h2>Add a prescription</h2>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-xl · 1.5rem · Inter · 600 · tabular-nums · OTP / code
              inputs
            </span>
            <p className="sg-type-xl">ABC-1234</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-h3 · 1.25rem · Inter · 700
            </span>
            <h3>Lisinopril 10mg</h3>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-lg · 1.125rem · Inter · 700 · section subheadings
            </span>
            <p className="sg-type-lg">My Prescriptions</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-base · 1rem · Inter · 400
            </span>
            <p>
              Pillbug tracks your prescriptions and reminds you when it&apos;s
              time to take them — without filling your calendar with alarms you
              end up ignoring. Set it once, trust it daily.
            </p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-sm · 0.875rem · Inter · 400 · caption / secondary
            </span>
            <p className="sg-type-sm">
              Last taken: Thursday at 8:00 AM · Due in 14 hours
            </p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-xs · 0.75rem · Inter · 700 · uppercase · labels / pills
            </span>
            <p className="sg-type-xs">Next dose due</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-2xs · 0.65rem · Inter · 700 · nav tab labels / footer micro
            </span>
            <p className="sg-type-2xs">Fill · Prescriptions · Settings</p>
          </div>

          <div className="sg-type-row">
            <span className="sg-type-meta">
              --text-3xs · 0.5625rem · Inter · organizer grid only (FillSession)
            </span>
            <p className="sg-type-3xs">
              Mon · Tue · Wed · Thu · Fri · Sat · Sun
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
              <button className="button-primary button-leading-icon">
                <ClipboardPlus size={18} aria-hidden="true" />
                Add prescription
              </button>
              <button className="button-secondary button-leading-icon">
                <ChevronRight size={18} aria-hidden="true" />
                View details
              </button>
              <button className="button-danger button-leading-icon">
                <Trash2 size={18} aria-hidden="true" />
                Delete
              </button>
            </div>
            <p className="sg-button-note">
              Add <code>button-leading-icon</code> when the icon goes left of
              the label. A <code>::after</code> spacer mirrors the icon width so
              the label stays centered.
            </p>
          </div>

          <div className="sg-button-group">
            <p className="sg-button-group-label">Text + trailing icon</p>
            <div className="sg-button-row">
              <button className="button-primary button-trailing-icon">
                Continue
                <ArrowRight size={18} aria-hidden="true" />
              </button>
              <button className="button-secondary button-trailing-icon">
                Next step
                <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
            <p className="sg-button-note">
              Use <code>button-trailing-icon</code> for forward-navigation
              actions. A <code>::before</code> spacer mirrors the icon so the
              label centers. Put the icon after the label in markup.
            </p>
          </div>

          <SoftDisabledDemo />
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

      {/* ── Motif ── */}
      <Section id="motif" label="Brand motif — tilted pill">
        <p className="sg-icon-note">
          The tilted gold pill is Pillbug&apos;s visual motif — a single
          recurring shape that threads through the product to create brand
          cohesion. The pill is native to the product name and the medication
          domain. Tilting it adds energy; varying the angle per instance keeps
          it feeling hand-placed rather than stamped.
        </p>
        <div className="sg-motif-row">
          <span
            className="icon-pill"
            style={{ "--pill-angle": "-22deg" } as React.CSSProperties}
          >
            <Lock size={38} aria-hidden="true" />
          </span>
          <span
            className="icon-pill"
            style={{ "--pill-angle": "14deg" } as React.CSSProperties}
          >
            <CalendarCheck size={38} aria-hidden="true" />
          </span>
          <span
            className="icon-pill"
            style={{ "--pill-angle": "-10deg" } as React.CSSProperties}
          >
            <Clipboard size={38} aria-hidden="true" />
          </span>
          <span
            className="icon-pill"
            style={{ "--pill-angle": "20deg" } as React.CSSProperties}
          >
            <Pill size={38} aria-hidden="true" />
          </span>
        </div>
        <p className="sg-icon-note" style={{ marginTop: "1rem" }}>
          Use <code>.icon-pill</code> with the <code>--pill-angle</code> CSS
          custom property. The icon counter-rotates automatically via{" "}
          <code>calc(var(--pill-angle) * -1)</code> so it stays upright. Vary
          the angle per instance — no two adjacent pills should share the same
          angle.
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
