export type Rank = "R1" | "R2" | "R3" | "R4" | "R5";

export interface MetricBracket {
  label: string;
  points: number;
  min?: number;
  max?: number;
  condition?: string; // for boolean/special conditions
}

export interface MetricDefinition {
  key: string;
  name: string;
  type: "number" | "boolean" | "tier" | "rank";
  unit?: string;
  maxPoints: number;
  brackets: MetricBracket[];
}

export const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    key: "hqLevel",
    name: "HQ Level",
    type: "number",
    maxPoints: 3,
    brackets: [
      { label: "30+", points: 3, min: 30 },
      { label: "28-29", points: 2, min: 28, max: 29 },
      { label: "≤27", points: 0, max: 27 },
    ],
  },
  {
    key: "troops",
    name: "Troops",
    type: "tier",
    maxPoints: 3,
    brackets: [
      { label: "T10 Complete", points: 3, condition: "T10C" },
      { label: "T10 started", points: 3, condition: "T10" },
      { label: "T9", points: 2, condition: "T9" },
      { label: "T8 or lower", points: 0, condition: "T8" },
    ],
  },
  {
    key: "rallyCap",
    name: "Rally Cap",
    type: "number",
    maxPoints: 3,
    brackets: [
      { label: "10", points: 3, min: 10 },
      { label: "9", points: 2, min: 9, max: 9 },
      { label: "≤8", points: 0, max: 8 },
    ],
  },
  {
    key: "allianceRecognition",
    name: "Alliance Recognition Research",
    type: "number",
    unit: "%",
    maxPoints: 2,
    brackets: [
      { label: "Complete (100%)", points: 2, min: 100 },
      { label: "≥70%", points: 1, min: 70, max: 99 },
      { label: "<70%", points: 0, max: 69 },
    ],
  },
  {
    key: "avaWeeklyScore",
    name: "AvA Weekly Score",
    type: "rank",
    unit: "rank",
    maxPoints: 4,
    brackets: [
      { label: "Top 30", points: 4, min: 1, max: 30 },
      { label: "31-50", points: 3, min: 31, max: 50 },
      { label: "51-70", points: 1, min: 51, max: 70 },
      { label: "71+", points: 0, min: 71 },
    ],
  },
  {
    key: "pcHeroes",
    name: "PC Heroes",
    type: "number",
    maxPoints: 3,
    brackets: [
      { label: ">50", points: 3, min: 50.01 },
      { label: "40-50", points: 2, min: 40, max: 50 },
      { label: "30-39", points: 1, min: 30, max: 39.99 },
      { label: "<30", points: 0, max: 29.99 },
    ],
  },
  {
    key: "techPower",
    name: "Tech Power",
    type: "number",
    unit: "M",
    maxPoints: 3,
    brackets: [
      { label: ">15M", points: 3, min: 15 },
      { label: "12-15M", points: 2, min: 12, max: 14.99 },
      { label: "10-11.99M", points: 1, min: 10, max: 11.99 },
      { label: "<10M", points: 0, max: 9.99 },
    ],
  },
  {
    key: "vehiclePower",
    name: "Vehicle Power",
    type: "number",
    unit: "M",
    maxPoints: 3,
    brackets: [
      { label: ">8M", points: 3, min: 8 },
      { label: "7-8M", points: 2, min: 7, max: 7.99 },
      { label: "6-7M", points: 1, min: 6, max: 6.99 },
      { label: "<6M", points: 0, max: 5.99 },
    ],
  },
  {
    key: "svsParticipation",
    name: "SvS Participation",
    type: "boolean",
    maxPoints: 3,
    brackets: [
      { label: "Yes", points: 3, condition: "yes" },
      { label: "No", points: 0, condition: "no" },
    ],
  },
  {
    key: "killCount",
    name: "Kill Count",
    type: "number",
    unit: "M",
    maxPoints: 3,
    brackets: [
      { label: ">1.5M", points: 3, min: 1.5 },
      { label: "1-1.5M", points: 1, min: 1, max: 1.49 },
      { label: "<1M", points: 0, max: 0.99 },
    ],
  },
  {
    key: "engagement",
    name: "Engagement",
    type: "boolean",
    maxPoints: 1,
    brackets: [
      { label: "Yes", points: 1, condition: "yes" },
      { label: "No", points: 0, condition: "no" },
    ],
  },
];

export const MAX_TOTAL_POINTS = METRIC_DEFINITIONS.reduce((sum, m) => sum + m.maxPoints, 0);

export function calculateMetricPoints(metric: MetricDefinition, value: number | boolean | string): number {
  if (metric.type === "boolean") {
    const boolVal = typeof value === "boolean" ? value : value === "yes" || value === "Yes";
    return boolVal ? metric.brackets[0].points : 0;
  }

  if (metric.type === "tier") {
    const strVal = String(value).toUpperCase();
    const bracket = metric.brackets.find(b => b.condition && strVal.includes(b.condition!.toUpperCase()));
    return bracket ? bracket.points : 0;
  }

  // For "rank" type (AvA), lower number = better rank
  const numVal = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(numVal)) return 0;

  if (metric.type === "rank") {
    for (const bracket of metric.brackets) {
      const minOk = bracket.min === undefined || numVal >= bracket.min;
      const maxOk = bracket.max === undefined || numVal <= bracket.max;
      if (minOk && maxOk) return bracket.points;
    }
    return 0;
  }

  // number type - find matching bracket (check from highest points down)
  const sorted = [...metric.brackets].sort((a, b) => b.points - a.points);
  for (const bracket of sorted) {
    const minOk = bracket.min === undefined || numVal >= bracket.min;
    const maxOk = bracket.max === undefined || numVal <= bracket.max;
    if (minOk && maxOk) return bracket.points;
  }
  return 0;
}

export function calculateTotalScore(metrics: Record<string, number | boolean | string>): number {
  return METRIC_DEFINITIONS.reduce((total, def) => {
    const val = metrics[def.key];
    if (val === undefined || val === null) return total;
    return total + calculateMetricPoints(def, val);
  }, 0);
}

export interface RankThresholdEntry {
  rankKey: string;
  minPercent: number;
  maxPercent: number | null;
}

export function getRank(totalScore: number, isLeadership?: Rank, thresholds?: RankThresholdEntry[], maxPoints: number = MAX_TOTAL_POINTS): Rank {
  if (isLeadership === "R4" || isLeadership === "R5") return isLeadership;
  const pct = maxPoints > 0 ? (totalScore / maxPoints) * 100 : 0;
  if (thresholds && thresholds.length > 0) {
    // Sort descending by minPercent so we match highest rank first
    const sorted = [...thresholds].sort((a, b) => b.minPercent - a.minPercent);
    for (const t of sorted) {
      if (pct >= t.minPercent) return t.rankKey as Rank;
    }
    return "R1";
  }
  // Fallback hardcoded percent thresholds
  if (pct >= 85) return "R3";
  if (pct >= 50) return "R2";
  return "R1";
}

  return "R1";
}

export function getRankColor(rank: Rank): string {
  const colors: Record<Rank, string> = {
    R1: "text-rank-r1",
    R2: "text-rank-r2",
    R3: "text-rank-r3",
    R4: "text-rank-r4",
    R5: "text-rank-r5",
  };
  return colors[rank];
}

export function getRankBgColor(rank: Rank): string {
  const colors: Record<Rank, string> = {
    R1: "bg-rank-r1",
    R2: "bg-rank-r2",
    R3: "bg-rank-r3",
    R4: "bg-rank-r4",
    R5: "bg-rank-r5",
  };
  return colors[rank];
}
