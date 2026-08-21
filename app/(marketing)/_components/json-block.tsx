function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Minimal JSON syntax tinting. Escapes first, then wraps tokens, so no value
 * from the database can inject markup.
 */
function highlight(json: string): string {
  return escapeHtml(json).replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
    (match) => {
      let cls = "text-amber-300"; // numbers
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? "text-sky-300" : "text-emerald-300";
      } else if (/true|false/.test(match)) {
        cls = "text-purple-300";
      } else if (/null/.test(match)) {
        cls = "text-slate-500";
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export function JsonBlock({ value }: { value: unknown }) {
  const json = JSON.stringify(value, null, 2) ?? "undefined";

  // min-w-0 lets the block shrink inside flex/grid parents; overflow-x-auto then
  // scrolls the JSON itself instead of widening the page.
  return (
    <pre
      className="min-w-0 max-w-full overflow-x-auto text-[10px] leading-relaxed text-slate-300 sm:text-[11px]"
      dangerouslySetInnerHTML={{ __html: highlight(json) }}
    />
  );
}
