export type Variant = "primary" | "secondary" | "danger" | "none";
export type IconPosition = "leading" | "trailing";

export type ButtonVisualProps = {
  variant: Variant;
  size?: "sm";
  iconOnly?: boolean;
  iconPosition?: IconPosition;
  fullWidth?: boolean;
  className?: string;
};

const VARIANT_CLASS: Record<Exclude<Variant, "none">, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  danger: "button-danger",
};

// Exported for the rare case where a call site needs a real `Link`/`a`
// element for its own typing reasons (e.g. TanStack Router's per-route
// `params` type, which a non-generic `as="link"` prop can't preserve) but
// still wants the typed variant vocabulary instead of a raw className.
export function buildButtonClassName({
  variant,
  size,
  iconOnly,
  iconPosition,
  fullWidth,
  className,
}: ButtonVisualProps): string {
  const classes = ["button"];
  if (variant !== "none") classes.push(VARIANT_CLASS[variant]);
  if (size === "sm") classes.push("button-sm");
  if (iconOnly) classes.push("button-icon");
  if (iconPosition) classes.push(`button-${iconPosition}-icon`);
  if (fullWidth) classes.push("button-full");
  if (className) classes.push(className);
  return classes.join(" ");
}
