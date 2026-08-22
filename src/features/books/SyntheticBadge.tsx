import { SYNTHETIC_BADGE_LABEL } from "@/src/core/books/entities";

/**
 * Amber warning treatment, deliberately distinct from the blue/white accent
 * used for interactive elements — this must not read as a feature tag.
 */
export function SyntheticBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block rounded border border-amber-500/50 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-amber-300 uppercase ${className}`}
    >
      {SYNTHETIC_BADGE_LABEL}
    </span>
  );
}
