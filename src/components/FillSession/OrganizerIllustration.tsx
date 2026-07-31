import type { CSSProperties } from "react";
import { Pill } from "lucide-react";
import type { Compartment } from "../../../shared/fill-session";
import "./OrganizerIllustration.css";

interface OrganizerIllustrationProps {
  compartments: Compartment[];
}

export function OrganizerIllustration({
  compartments,
}: OrganizerIllustrationProps) {
  return (
    <div
      className="organizer-illustration"
      style={{ "--comp-count": compartments.length } as CSSProperties}
      aria-hidden="true"
    >
      {compartments.map((compartment) => (
        <div className="organizer-illustration-cell" key={compartment.label}>
          <Pill
            size={16}
            aria-hidden="true"
            className="organizer-illustration-pill"
          />
          <span className="organizer-illustration-label">
            {compartment.label}
          </span>
        </div>
      ))}
    </div>
  );
}
