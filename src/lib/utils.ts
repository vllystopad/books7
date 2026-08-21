export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function truncateText(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

export function tokenCount(text: string): number {
  // Rough approximation: ~1.3 tokens per word
  return Math.ceil(text.split(/\s+/).length * 1.3);
}
