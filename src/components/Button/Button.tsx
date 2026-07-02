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

export function Button({ as, ...rest }: ButtonProps) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
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
        className={mergeClass("button", className)}
        {...props}
      />
    );
  }
  if (as === "link") {
    const { className, ...props } = rest as ComponentProps<typeof Link>;
    return <Link className={mergeClass("button", className)} {...props} />;
  }

  const { className, disabledReason, onDisabledClick, ...props } =
    rest as AsButton;

  if (props.disabled && (disabledReason !== undefined || onDisabledClick)) {
    const { disabled: _disabled, onClick: _onClick, ...buttonProps } = props;
    const blockedClass = isBlocked ? " button--blocked" : "";
    return (
      <span className="button-tooltip-wrapper">
        {disabledReason && tooltipVisible && (
          <span className="button-tooltip" role="status">
            {disabledReason}
          </span>
        )}
        <button
          className={mergeClass("button", className) + blockedClass}
          aria-disabled="true"
          onClick={(e) => {
            e.preventDefault();
            if (!isBlocked) {
              setIsBlocked(true);
              setTimeout(() => setIsBlocked(false), 300);
            }
            if (disabledReason) {
              setTooltipVisible(true);
              if (tooltipTimerRef.current)
                clearTimeout(tooltipTimerRef.current);
              tooltipTimerRef.current = setTimeout(
                () => setTooltipVisible(false),
                3000,
              );
            }
            onDisabledClick?.();
          }}
          {...buttonProps}
        />
      </span>
    );
  }

  return <button className={mergeClass("button", className)} {...props} />;
}
