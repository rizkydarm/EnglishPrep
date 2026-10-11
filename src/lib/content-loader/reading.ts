const GAP_RE = /\[\[GAP:(\d+)\]\]/g;

export interface TextPart {
  type: "text";
  value: string;
}

export interface GapPart {
  type: "gap";
  index: number;
}

export type PassagePart = TextPart | GapPart;

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

// Splits a passage body into ordered parts, turning each [[GAP:n]] into a gap
// marker. The regex is created per call so repeated calls never share lastIndex.
export function parseGaps(body: string): PassagePart[] {
  const parts: PassagePart[] = [];
  const re = /\[\[GAP:(\d+)\]\]/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) parts.push({ type: "text", value: body.slice(last, m.index) });
    parts.push({ type: "gap", index: Number(m[1]) });
    last = m.index + m[0].length;
  }
  if (last < body.length) parts.push({ type: "text", value: body.slice(last) });
  return parts;
}

const CLOSING_PUNCT = new Set(['"', "'", ")", "]"]);

// Deterministic sentence splitter. Gap markers are dropped first so sentence
// indices stay stable whether or not the passage has gaps. A sentence ends at
// ".", "!" or "?" followed by whitespace or end of text, after any closing
// quote or bracket. Authors should avoid periods inside abbreviations.
export function splitSentences(body: string): string[] {
  const text = body
    .replace(/\[\[GAP:\d+\]\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text === "") return [];
  const sentences: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    let end = i + 1;
    while (end < text.length && CLOSING_PUNCT.has(text[end])) end++;
    if (end < text.length && text[end] !== " ") continue;
    const sentence = text.slice(start, end).trim();
    if (sentence !== "") sentences.push(sentence);
    start = end;
    i = end - 1;
  }
  const tail = text.slice(start).trim();
  if (tail !== "") sentences.push(tail);
  return sentences;
}
