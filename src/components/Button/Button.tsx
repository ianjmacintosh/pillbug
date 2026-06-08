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

export function Button(props: ButtonProps) {
  if (props.as === "a") {
    const { as, ...rest } = props;
    return <a {...rest} />;
  }
  if (props.as === "input") {
    const { as, ...rest } = props;
    return <input type="submit" {...rest} />;
  }
  if (props.as === "link") {
    const { as, ...rest } = props;
    return <Link {...rest} />;
  }
  const { as, ...rest } = props;
  return <button {...rest} />;
}
