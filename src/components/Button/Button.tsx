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

export function Button({ as, ...rest }: ButtonProps) {
  if (as === "a") {
    return <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} />;
  }
  if (as === "input") {
    return (
      <input
        type="submit"
        {...(rest as Omit<InputHTMLAttributes<HTMLInputElement>, "type">)}
      />
    );
  }
  if (as === "link") {
    return <Link {...(rest as ComponentProps<typeof Link>)} />;
  }
  return <button {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
