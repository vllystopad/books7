import Link from "next/link";

export const HIDE_SYNTHETIC_PARAM = "synthetic";
export const HIDE_SYNTHETIC_VALUE = "hide";

/** Reads the filter state out of the URL. Default is to show everything. */
export function shouldHideSynthetic(
  searchParams: Record<string, string | string[] | undefined>
): boolean {
  const raw = searchParams[HIDE_SYNTHETIC_PARAM];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === HIDE_SYNTHETIC_VALUE;
}

/**
 * Link-based toggle: the choice lives entirely in the query string, so it is
 * shareable and survives a reload with no client state.
 */
export function SyntheticFilter({
  hideSynthetic,
  syntheticCount,
}: {
  hideSynthetic: boolean;
  syntheticCount: number;
}) {
  const base = "rounded-md px-2.5 py-1 text-xs transition";
  const on = "bg-slate-800 font-medium text-white";
  const off = "text-slate-400 hover:text-slate-200";

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Catalogue filter">
      <Link
        href="/"
        aria-current={!hideSynthetic ? "true" : undefined}
        className={`${base} ${hideSynthetic ? off : on}`}
      >
        All
      </Link>
      <Link
        href={`/?${HIDE_SYNTHETIC_PARAM}=${HIDE_SYNTHETIC_VALUE}`}
        aria-current={hideSynthetic ? "true" : undefined}
        className={`${base} ${hideSynthetic ? on : off}`}
      >
        Hide AI-generated
        {syntheticCount > 0 && (
          <span className="ml-1.5 text-[10px] text-amber-400">{syntheticCount}</span>
        )}
      </Link>
    </div>
  );
}
