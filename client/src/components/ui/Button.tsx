import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700 shadow-sm",
  secondary:
    "bg-white text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400",
  ghost:
    "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900",
  danger:
    "bg-transparent text-red-600 border-transparent hover:bg-red-50 hover:text-red-700",
};

export function Button({
  variant = "secondary",
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        className,
      )}
      disabled={disabled}
      {...props}
    />
  );
}
