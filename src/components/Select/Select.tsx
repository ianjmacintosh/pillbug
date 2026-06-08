import type { ReactNode, SelectHTMLAttributes } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function Select({
  label,
  className,
  children,
  ...selectProps
}: SelectProps) {
  return (
    <label className={className}>
      {label}
      <select {...selectProps}>{children}</select>
    </label>
  );
}
