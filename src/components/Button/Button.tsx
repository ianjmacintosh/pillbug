import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  InputHTMLAttributes,
} from "react";

type AsButton = { as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>;
type AsAnchor = { as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>;
type AsInput = { as: "input" } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
>;

type ButtonProps = AsButton | AsAnchor | AsInput;

export function Button(props: ButtonProps) {
  if (props.as === "a") {
    const { as, ...rest } = props;
    return <a {...rest} />;
  }
  if (props.as === "input") {
    const { as, ...rest } = props;
    return <input type="submit" {...rest} />;
  }
  const { as, ...rest } = props;
  return <button {...rest} />;
}
