type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** Adds hover/press feedback. Only set this when the whole card is clickable. */
  interactive?: boolean;
};

export default function Card({ interactive = false, className = "", children, ...props }: CardProps) {
  return (
    <div
      className={[
        "rounded-2xl border border-border bg-surface p-6 sm:p-8",
        interactive ? "transition-colors hover:border-text-muted/40 hover:bg-surface-hover active:bg-surface-hover" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}
