import type { Member } from "@/lib/mock-data";
import { calculateTotalScore, MAX_TOTAL_POINTS } from "@/lib/scoring";

export type RiskSeverity = "high" | "medium" | "low";

export interface RiskFlag {
  key: string;
  label: string;
  detail?: string;
  severity: RiskSeverity;
}

export interface WeekContext {
  /** Number of active (toggled-on) attendance events for the week */
  activeEventCount: number;
  /** Number of those events the member was marked "check" for */
  attendedEventCount: number;
  /** Number of polls open for the week */
  pollCount: number;
  /** Number of polls the member responded to */
  pollResponseCount: number;
  /** Whether SvS is toggled on this week */
  svsActive: boolean;
  /** Whether the member was marked attending SvS this week */
  svsAttended: boolean;
  /** Whether any member has been marked attending SvS this week (i.e. attendance has started being recorded) */
  svsAttendanceRecorded: boolean;
  /** Whether AvA is toggled on this week */
  avaActive: boolean;
  /** AvA rank this week (0/null = no rank entered) */
  avaRank: number | null;
}

export const RISK_INDICATORS = [
  { key: "alliance_recognition", label: "Alliance Recognition <100%" },
  { key: "ava_weak", label: "AvA missing or ≥50" },
  { key: "zero_participation", label: "Zero weekly participation" },
  { key: "missed_svs", label: "Missed SvS" },
  { key: "low_score", label: "Overall score in R1 range" },
  { key: "low_troops", label: "T8 troops or lower" },
  { key: "low_hq", label: "HQ ≤27" },
  
] as const;

export function evaluateMemberRisk(member: Member, ctx: WeekContext): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const m = member.metrics;

  const ar = Number(m.allianceRecognition ?? 0);
  if (ar < 100) {
    flags.push({
      key: "alliance_recognition",
      label: "Alliance Recognition <100%",
      detail: `${ar}%`,
      severity: ar < 70 ? "high" : "medium",
    });
  }

  if (ctx.avaActive) {
    const ava = ctx.avaRank ?? 0;
    if (ava >= 50) {
      flags.push({
        key: "ava_weak",
        label: `AvA rank #${ava}`,
        severity: ava >= 71 ? "high" : "medium",
      });
    }
  }

  // Zero weekly participation: nothing attended, no polls answered, no AvA rank
  const totalOpportunities = ctx.activeEventCount + ctx.pollCount;
  const totalActions = ctx.attendedEventCount + ctx.pollResponseCount;
  if (totalOpportunities > 0 && totalActions === 0) {
    flags.push({
      key: "zero_participation",
      label: "Zero weekly participation",
      detail: `0 / ${totalOpportunities}`,
      severity: "high",
    });
  }

  // Only flag missed SvS once attendance has started being recorded for the week
  if (ctx.svsActive && ctx.svsAttendanceRecorded && !ctx.svsAttended) {
    flags.push({
      key: "missed_svs",
      label: "Missed SvS",
      severity: "high",
    });
  }

  const score = calculateTotalScore(m);
  const pct = MAX_TOTAL_POINTS > 0 ? (score / MAX_TOTAL_POINTS) * 100 : 0;
  if (pct < 50) {
    flags.push({
      key: "low_score",
      label: "Low overall score",
      detail: `${Math.round(pct)}%`,
      severity: "medium",
    });
  }

  const troops = String(m.troops ?? "").toUpperCase();
  if (troops && !troops.includes("T9") && !troops.includes("T10")) {
    flags.push({
      key: "low_troops",
      label: "T8 troops or lower",
      severity: "low",
    });
  }

  const hq = Number(m.hqLevel ?? 0);
  if (hq > 0 && hq <= 27) {
    flags.push({
      key: "low_hq",
      label: "HQ ≤27",
      detail: `HQ ${hq}`,
      severity: "low",
    });
  }

  return flags;
}

export function severityRank(s: RiskSeverity): number {
  return s === "high" ? 3 : s === "medium" ? 2 : 1;
}

export function severityClasses(s: RiskSeverity): string {
  if (s === "high") return "border-destructive/50 bg-destructive/10 text-destructive";
  if (s === "medium") return "border-gold/50 bg-gold/10 text-gold";
  return "border-border bg-secondary text-muted-foreground";
}
