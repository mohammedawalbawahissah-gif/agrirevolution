import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand-green text-white hover:bg-brand-green-dark disabled:opacity-50",
  secondary:
    "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50",
  danger: "bg-status-danger text-white hover:opacity-90 disabled:opacity-50",
  ghost: "text-gray-500 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-2.5 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2 gap-2",
};

/**
 * Shared button used across every portal so primary/secondary/danger/ghost
 * actions look and behave identically everywhere (loading state included),
 * instead of each page hand-rolling its own button classes.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading, disabled, className = "", children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-md font-medium transition-colors ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...rest}
    >
      {isLoading && <Loader2 size={size === "sm" ? 12 : 14} className="animate-spin" />}
      {children}
    </button>
  );
});

export default Button;
