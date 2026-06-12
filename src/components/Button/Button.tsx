import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ComponentProps,
  InputHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";

type AsButton = { as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>;
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
  const { className, ...props } =
    rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return <button className={mergeClass("button", className)} {...props} />;
}
