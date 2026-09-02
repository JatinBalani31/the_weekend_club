"use client";

import { forwardRef, useId } from "react";

/**
 * Field styling shared by Input and by the raw `textarea` / `select` elements in
 * forms that need them, so every control in the app matches without duplicating
 * the class list.
 */
export const fieldStyles =
  "block w-full min-h-11 rounded-xl border border-border bg-surface px-4 py-3 font-body text-base " +
  "text-text outline-none transition-colors placeholder:text-text-muted/60 " +
  "focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50";

export const fieldLabelStyles =
  "mb-2 flex items-baseline justify-between gap-3 font-body text-xs font-bold uppercase tracking-[0.14em] text-text-muted";

export const fieldErrorStyles = "mt-2 block font-body text-xs font-medium text-error";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = "", id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div>
      <label htmlFor={inputId} className={fieldLabelStyles}>
        <span>{label}</span>
        {hint && <span className="font-medium normal-case tracking-normal text-text-muted/70">{hint}</span>}
      </label>
      <input
        id={inputId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={[
          fieldStyles,
          error ? "border-error focus:border-error focus:ring-error/30" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && (
        <p id={errorId} className={fieldErrorStyles}>
          {error}
        </p>
      )}
    </div>
  );
});

export default Input;
