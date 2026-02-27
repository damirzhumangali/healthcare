import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
};

export default function Button({ variant = "primary", className = "", ...props }: Props) {
  const v =
    variant === "ghost" ? "btn--ghost" : variant === "danger" ? "btn--danger" : "btn--primary";

  return <button {...props} className={`btn ${v} ${className}`} />;
}
