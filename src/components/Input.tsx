import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
};

export default function Input({ label, hint, className = "", ...props }: Props) {
  return (
    <label className="field">
      {label ? <span className="field__label">{label}</span> : null}
      <input {...props} className={`input ${className}`} />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}
