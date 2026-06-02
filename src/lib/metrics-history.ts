import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { Member } from "@/lib/mock-data";
import {
  calculateTotalScore,
  getRank,
  type RankThresholdEntry,
  type Rank,
} from "@/lib/scoring";

export type SnapshotSource = "baseline" | "edit" | "auto_weekly" | "manual";

interface SnapshotArgs {
  member: Member;
  source: SnapshotSource;
  weekId?: string | null;
  thresholds?: RankThresholdEntry[];
  maxPoints?: number;
  /** Per-week event points to add into the snapshotted total_score. */
  eventBonus?: { earned: number; max: number };
}

/**
 * Upsert a single member_metrics_history row.
 * Dedupes per (member_id, recorded_date): the latest write per UTC day wins.
 */
export async function snapshotMemberMetrics({
  member,
  source,
  weekId = null,
  thresholds,
  maxPoints,
  eventBonus,
}: SnapshotArgs) {
  const baseScore = calculateTotalScore(member.metrics);
  const totalScore = baseScore + (eventBonus?.earned ?? 0);
  const effectiveMax = (maxPoints ?? undefined) !== undefined
    ? (maxPoints as number) + (eventBonus?.max ?? 0)
    : undefined;
  const rank: Rank = getRank(totalScore, member.leadershipRank, thresholds, effectiveMax);
  const today = new Date().toISOString().slice(0, 10);
  const row = {
    member_id: member.id,
    metrics: member.metrics as unknown as Json,
    power: member.power ?? 0,
    leadership_rank: member.leadershipRank ?? null,
    total_score: totalScore,
    rank,
    source,
    week_id: weekId,
    recorded_at: new Date().toISOString(),
    recorded_date: today,
  };
  const { error } = await supabase
    .from("member_metrics_history")
    .upsert(row, { onConflict: "member_id,recorded_date" });
  if (error) {
    console.error("snapshotMemberMetrics failed", error);
  }
}

export async function snapshotAllMembers(
  members: Member[],
  source: SnapshotSource,
  weekId?: string | null,
  thresholds?: RankThresholdEntry[],
  maxPoints?: number,
) {
  // Sequential to keep request bursts modest; dataset is ~100 rows.
  for (const m of members) {
    await snapshotMemberMetrics({ member: m, source, weekId: weekId ?? null, thresholds, maxPoints });
  }
}
