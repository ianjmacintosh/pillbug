import "./Button.css";
import { useEffect, useRef, useState } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";
import { buildButtonClassName } from "./Button.helpers";
import type { ButtonVisualProps } from "./Button.helpers";

export type {
  Variant,
  IconPosition,
  ButtonVisualProps,
} from "./Button.helpers";

type AsButton = {
  as?: "button";
  disabledReason?: string;
  onDisabledClick?: () => void;
} & ButtonVisualProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;
type AsAnchor = { as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>;
type AsInput = { as: "input" } & ButtonVisualProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;
type AsLink = { as: "link" } & ButtonVisualProps &
  Omit<ComponentProps<typeof Link>, "className">;

type ButtonProps = AsButton | AsAnchor | AsInput | AsLink;

function mergeClass(base: string, extra?: string) {
  return extra ? `${base} ${extra}` : base;
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
    const {
      variant,
      size,
      iconOnly,
      iconPosition,
      fullWidth,
      className,
      ...props
    } = rest as ButtonVisualProps &
      Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">;
    return (
      <input
        type="submit"
        className={buildButtonClassName({
          variant,
          size,
          iconOnly,
          iconPosition,
          fullWidth,
          className,
        })}
        {...props}
      />
    );
  }

  if (as === "link") {
    const {
      variant,
      size,
      iconOnly,
      iconPosition,
      fullWidth,
      className,
      ...props
    } = rest as ButtonVisualProps &
      Omit<ComponentProps<typeof Link>, "className">;
    return (
      <Link
        className={buildButtonClassName({
          variant,
          size,
          iconOnly,
          iconPosition,
          fullWidth,
          className,
        })}
        {...props}
      />
    );
  }

  const {
    variant,
    size,
    iconOnly,
    iconPosition,
    fullWidth,
    className,
    disabledReason,
    onDisabledClick,
    disabled,
    onClick,
    ...buttonProps
  } = rest as ButtonVisualProps & {
    disabledReason?: string;
    onDisabledClick?: () => void;
  } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">;

  const composedClassName = buildButtonClassName({
    variant,
    size,
    iconOnly,
    iconPosition,
    fullWidth,
    className,
  });

  if (disabled && (disabledReason !== undefined || onDisabledClick)) {
    const blockedClass = isBlocked ? " button--blocked" : "";
    return (
      <span
        className="button-tooltip-wrapper"
        style={fullWidth ? { width: "100%" } : undefined}
      >
        {disabledReason && tooltipVisible && (
          <span className="button-tooltip" role="status">
            {disabledReason}
          </span>
        )}
        <button
          className={composedClassName + blockedClass}
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
      className={composedClassName}
      disabled={disabled}
      onClick={onClick}
      {...buttonProps}
    />
  );
}
