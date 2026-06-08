import type { InputHTMLAttributes, ReactNode } from "react";

interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  children: ReactNode;
}

export function Checkbox({
  children,
  className,
  ...inputProps
}: CheckboxProps) {
  return (
    <label className={className}>
      <input type="checkbox" {...inputProps} />
      {children}
    </label>
  );
}
