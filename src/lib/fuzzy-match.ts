export function levenshtein(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;
  const prev = new Array(t.length + 1);
  for (let i = 0; i <= t.length; i++) prev[i] = i;
  for (let i = 1; i <= s.length; i++) {
    let curr = i;
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      const next = Math.min(curr + 1, prev[j] + 1, prev[j - 1] + cost);
      prev[j - 1] = curr;
      curr = next;
    }
    prev[t.length] = curr;
  }
  return prev[t.length];
}

export interface MatchCandidate<T> {
  item: T;
  score: number; // lower is better
  exact: boolean;
}

export function bestMatch<T>(
  query: string,
  items: T[],
  getName: (item: T) => string
): MatchCandidate<T> | null {
  if (!items.length) return null;
  const q = query.trim().toLowerCase();
  let best: MatchCandidate<T> | null = null;
  for (const item of items) {
    const name = getName(item).trim().toLowerCase();
    if (!name) continue;
    let score: number;
    let exact = false;
    if (name === q) {
      score = 0;
      exact = true;
    } else if (name.includes(q) || q.includes(name)) {
      score = Math.abs(name.length - q.length);
    } else {
      score = levenshtein(q, name);
    }
    if (!best || score < best.score) {
      best = { item, score, exact };
    }
  }
  return best;
}
