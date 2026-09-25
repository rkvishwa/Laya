import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Variant = "error" | "warning" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
};

export function Alert({
  variant = "info",
  className,
  ...props
}: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 text-sm",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
