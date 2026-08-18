// PROTOTYPE INFRASTRUCTURE — throwaway, see .claude/skills/prototype/UI.md.
// Shared floating variant switcher for UI prototypes. Not meant to ship;
// delete alongside whichever page's prototype variants used it once a
// winner is picked.
import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./PrototypeSwitcher.css";

export interface PrototypeVariant {
  key: string;
  label: string;
}

interface PrototypeSwitcherProps {
  variants: PrototypeVariant[];
  current: string;
  onChange: (key: string) => void;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

export function PrototypeSwitcher({
  variants,
  current,
  onChange,
}: PrototypeSwitcherProps) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;
      if (e.key === "ArrowLeft") {
        onChange(variants[(index - 1 + variants.length) % variants.length].key);
      } else if (e.key === "ArrowRight") {
        onChange(variants[(index + 1) % variants.length].key);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, variants, onChange]);

  if (!import.meta.env.DEV) return null;

  const activeLabel = variants[index]?.label ?? current;

  return (
    <div
      className="prototype-switcher"
      role="toolbar"
      aria-label="Prototype variant switcher"
    >
      <button
        type="button"
        className="prototype-switcher__arrow"
        aria-label="Previous variant"
        onClick={() =>
          onChange(
            variants[(index - 1 + variants.length) % variants.length].key,
          )
        }
      >
        <ChevronLeft size={18} aria-hidden="true" />
      </button>
      <span className="prototype-switcher__label">{activeLabel}</span>
      <button
        type="button"
        className="prototype-switcher__arrow"
        aria-label="Next variant"
        onClick={() => onChange(variants[(index + 1) % variants.length].key)}
      >
        <ChevronRight size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
