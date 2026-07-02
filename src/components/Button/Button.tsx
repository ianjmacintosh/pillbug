import { useState } from "react";
import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";

type AsButton = {
  as?: "button";
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

  const { className, onDisabledClick, ...props } = rest as AsButton;

  if (props.disabled && onDisabledClick) {
    const { disabled: _disabled, onClick: _onClick, ...buttonProps } = props;
    const blockedClass = isBlocked ? " button--blocked" : "";
    return (
      <button
        className={mergeClass("button", className) + blockedClass}
        aria-disabled="true"
        onClick={(e) => {
          e.preventDefault();
          if (!isBlocked) {
            setIsBlocked(true);
            setTimeout(() => setIsBlocked(false), 300);
          }
          onDisabledClick();
        }}
        {...buttonProps}
      />
    );
  }

  return <button className={mergeClass("button", className)} {...props} />;
}
