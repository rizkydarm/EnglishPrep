const GAP_RE = /\[\[GAP:(\d+)\]\]/g;

export function extractGapNumbers(body: string): number[] {
  const out: number[] = [];
  GAP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = GAP_RE.exec(body)) !== null) {
    out.push(Number(m[1]));
  }
  return out;
}

export function validateGaps(body: string): string | null {
  const nums = extractGapNumbers(body);
  if (nums.length === 0) return null;
  const seen = new Set<number>();
  for (const n of nums) {
    if (seen.has(n)) return `duplicate [[GAP:${n}]]`;
    seen.add(n);
  }
  const max = Math.max(...nums);
  const missing: number[] = [];
  for (let i = 1; i <= max; i++) {
    if (!seen.has(i)) missing.push(i);
  }
  if (missing.length > 0) {
    return `missing [[GAP:${missing.join("]], [[GAP:")}]] in sequence 1..${max}`;
  }
  return null;
}
