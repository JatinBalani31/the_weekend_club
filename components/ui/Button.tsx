import { forwardRef } from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: "bg-accent text-bg hover:bg-accent-hover",
  secondary: "border border-border bg-transparent text-text hover:border-text-muted hover:bg-surface",
  ghost: "bg-transparent text-text hover:bg-surface",
};

// md and lg clear the 44px minimum touch target; sm is for dense, non-critical actions.
const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "min-h-9 px-4 text-xs",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-12 px-7 text-sm sm:text-base",
};

/**
 * Shared button styling, exported so `Link`s that should look like buttons can
 * reuse it without duplicating the class list.
 */
export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className = "") {
  return [
    "inline-flex items-center justify-center gap-2 rounded-full font-body font-semibold uppercase",
    "tracking-[0.08em] transition-colors focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
    "disabled:cursor-not-allowed disabled:opacity-50",
    VARIANT_STYLES[variant],
    SIZE_STYLES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", isLoading = false, disabled, className = "", children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={buttonStyles(variant, size, className)}
      {...props}
    >
      {isLoading && <Loader2 aria-hidden="true" size={16} className="animate-spin" />}
      {children}
    </button>
  );
});

export default Button;
