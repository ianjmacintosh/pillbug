import "./Button.css";
import { useEffect, useRef, useState } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";

type AsButton = {
  as?: "button";
  disabledReason?: string;
  onDisabledClick?: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;
type AsAnchor = { as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>;
type AsInput = { as: "input" } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;
type AsLink = { as: "link" } & ComponentProps<typeof Link>;

type ButtonProps = AsButton | AsAnchor | AsInput | AsLink;

function mergeClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
}

// "a" is excluded: raw anchors are the one variant genuinely used for plain
// inline text links (e.g. "Terms of Service"), where a gold button face
// would be wrong. button/input/link default here because a bare instance of
// those is always meant to be a styled CTA, never plain text.
function mergeClassDefaultPrimary(base: string, extra?: string) {
  return mergeClass(base, extra ?? "button-primary");
}

export function Button({ as, ...rest }: ButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const dismissHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (dismissHandlerRef.current) {
        document.removeEventListener("click", dismissHandlerRef.current);
      }
    };
  }, []);

  if (as === "a") {
    const { className, ...props } =
      rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return <a className={mergeClass("button", className)} {...props} />;
  }
  if (as === "input") {
    const { className, ...props } = rest as Omit<
      InputHTMLAttributes<HTMLInputElement>,
      "type"
    >;
    return (
      <input
        type="submit"
        className={mergeClassDefaultPrimary("button", className)}
        {...props}
      />
    );
  }
  if (as === "link") {
    const { className, ...props } = rest as ComponentProps<typeof Link>;
    return (
      <Link
        className={mergeClassDefaultPrimary("button", className)}
        {...props}
      />
    );
  }

  const {
    className,
    disabledReason,
    onDisabledClick,
    disabled,
    onClick,
    ...buttonProps
  } = rest as AsButton;

  if (disabled && (disabledReason !== undefined || onDisabledClick)) {
    const blockedClass = isBlocked ? " button--blocked" : "";
    const isFullWidth = !!className?.split(/\s+/).includes("button-full");
    return (
      <span
        className="button-tooltip-wrapper"
        style={isFullWidth ? { width: "100%" } : undefined}
      >
        {disabledReason && tooltipVisible && (
          <span className="button-tooltip" role="status">
            {disabledReason}
          </span>
        )}
        <button
          className={
            mergeClassDefaultPrimary("button", className) + blockedClass
          }
          aria-disabled="true"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.preventDefault();
            if (!isBlocked) {
              setIsBlocked(true);
              setTimeout(() => setIsBlocked(false), 300);
            }
            if (disabledReason) {
              setTooltipVisible(true);
              if (dismissHandlerRef.current) {
                document.removeEventListener(
                  "click",
                  dismissHandlerRef.current,
                );
              }
              const dismiss = () => {
                setTooltipVisible(false);
                dismissHandlerRef.current = null;
              };
              dismissHandlerRef.current = dismiss;
              // Defer so this click doesn't immediately dismiss the tooltip
              setTimeout(() => {
                document.addEventListener("click", dismiss, { once: true });
              }, 0);
            }
            onDisabledClick?.();
          }}
          {...buttonProps}
        />
      </span>
    );
  }

  return (
    <button
      className={mergeClassDefaultPrimary("button", className)}
      disabled={disabled}
      onClick={onClick}
      {...buttonProps}
    />
  );
}
