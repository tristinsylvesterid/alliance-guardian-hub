import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyEvents, type WeeklyEventData } from "@/hooks/use-weekly-events";
import { useEventScoring } from "@/hooks/use-event-scoring";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import type { Rank } from "@/lib/scoring";

export interface MemberSnapshot {
  totalScore: number;
  rank: Rank | null;
  metrics: Record<string, number | boolean | string>;
  leadershipRank: "R4" | "R5" | null;
  recordedAt: string;
}

async function fetchWeekSnapshot(weekId: string): Promise<Record<string, MemberSnapshot>> {
  const { data } = await supabase
    .from("member_metrics_history")
    .select("member_id,metrics,total_score,rank,leadership_rank,recorded_at")
    .eq("week_id", weekId)
    .eq("source", "auto_weekly")
    .order("recorded_at", { ascending: false });
  const map: Record<string, MemberSnapshot> = {};
  for (const row of data ?? []) {
    if (map[row.member_id]) continue;
    const rawMetrics =
      row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
        ? (row.metrics as Record<string, unknown>)
        : {};
    const metrics: Record<string, number | boolean | string> = {};
    for (const [k, v] of Object.entries(rawMetrics)) {
      if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") metrics[k] = v;
    }
    map[row.member_id] = {
      totalScore: row.total_score ?? 0,
      rank: (row.rank as Rank | null) ?? null,
      metrics,
      leadershipRank:
        row.leadership_rank === "R4" || row.leadership_rank === "R5" ? row.leadership_rank : null,
      recordedAt: row.recorded_at,
    };
  }
  return map;
}

/**
 * Reads scoring data from the last two archived weeks. All "display" surfaces
 * (Rankings, Dashboard, Members, At-Risk) should use `latest` so they reflect
 * the most recent completed week's final scores (fixed + events), not the
 * in-progress week.
 */
export function useArchivedSnapshot() {
  const { archivedWeeks } = useWeeklyEvents();
  const { getEventMaxForWeek } = useEventScoring();
  const { maxTotal: BASE_MAX_POINTS } = useScoringConfig();

  const latest: WeeklyEventData | null = archivedWeeks[0] ?? null;
  const previous: WeeklyEventData | null = archivedWeeks[1] ?? null;

  const [latestByMember, setLatestByMember] = useState<Record<string, MemberSnapshot>>({});
  const [previousByMember, setPreviousByMember] = useState<Record<string, MemberSnapshot>>({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [l, p] = await Promise.all([
      latest ? fetchWeekSnapshot(latest.weekId) : Promise.resolve({}),
      previous ? fetchWeekSnapshot(previous.weekId) : Promise.resolve({}),
    ]);
    setLatestByMember(l);
    setPreviousByMember(p);
    setLoading(false);
  }, [latest?.weekId, previous?.weekId]);

  useEffect(() => {
    load();
  }, [load]);

  const latestEventMax = latest ? getEventMaxForWeek(latest.weekId) : 0;
  const previousEventMax = previous ? getEventMaxForWeek(previous.weekId) : 0;
  const latestMax = BASE_MAX_POINTS + latestEventMax;
  const previousMax = BASE_MAX_POINTS + previousEventMax;

  return {
    latest,
    previous,
    latestByMember,
    previousByMember,
    latestMax,
    previousMax,
    hasArchive: !!latest,
    hasTwoArchives: !!latest && !!previous,
    loading,
    refresh: load,
  };
}
