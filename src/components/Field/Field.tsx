import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Field({ label, className, ...inputProps }: FieldProps) {
  return (
    <label className={className}>
      {label}
      <input {...inputProps} />
    </label>
  );
}
