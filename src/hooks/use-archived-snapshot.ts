import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWeeklyEvents, type WeeklyEventData } from "@/hooks/use-weekly-events";
import { useEventScoring } from "@/hooks/use-event-scoring";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import type { Member } from "@/lib/mock-data";
import { calculateInterimScore, calculateTotalScore, getRank, type Rank } from "@/lib/scoring";


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
  const { maxTotal: BASE_MAX_POINTS, metrics: metricDefs } = useScoringConfig();
  const { thresholds } = useRankThresholds();

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

  /**
   * Live display: recompute the fixed metric portion from the member's current
   * metrics, then add the archived event bonus from the last completed week.
   * This keeps stat edits visible immediately without waiting for the next
   * weekly archive, while preserving last week's AvA / event points.
   */
  const getDisplayFor = useCallback(
    (
      member: Member,
    ): {
      score: number;
      scoreMax: number;
      rank: Rank;
      hasSnap: boolean;
      interim: boolean;
    } => {
      const snap = latestByMember[member.id];
      if (snap) {
        const archivedBase = calculateTotalScore(snap.metrics, metricDefs);
        const eventBonus = Math.max(0, (snap.totalScore ?? 0) - archivedBase);
        const liveBase = calculateTotalScore(member.metrics, metricDefs);
        const score = Math.min(latestMax, liveBase + eventBonus);
        const rank = getRank(
          score,
          member.leadershipRank as Rank | undefined,
          thresholds,
          latestMax,
        );
        return { score, scoreMax: latestMax, rank, hasSnap: true, interim: false };
      }
      const interim = calculateInterimScore(member.metrics, metricDefs);
      const rank = getRank(
        interim.earned,
        member.leadershipRank as Rank | undefined,
        thresholds,
        interim.max,
      );
      return {
        score: interim.earned,
        scoreMax: interim.max,
        rank,
        hasSnap: false,
        interim: true,
      };
    },
    [latestByMember, metricDefs, latestMax, thresholds],
  );

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
    getDisplayFor,
  };
}

export interface MemberWindowAverage {
  recentAvgScore: number;
  priorAvgScore: number;
  recentRank: Rank;
  priorRank: Rank;
  recentCount: number;
  priorCount: number;
  leadershipRank: "R4" | "R5" | null;
}

/**
 * Compares the rolling average of the most recent N archived weeks against
 * the N weeks immediately before that. Used by the Rank Changes page.
 */
export function useArchivedWindowAverages(windowSize = 4) {
  const { archivedWeeks } = useWeeklyEvents();
  const { getEventMaxForWeek } = useEventScoring();
  const { maxTotal: BASE_MAX_POINTS } = useScoringConfig();
  const { thresholds } = useRankThresholds();

  const recentWindow = useMemo(
    () => archivedWeeks.slice(0, windowSize),
    [archivedWeeks, windowSize],
  );
  const priorWindow = useMemo(
    () => archivedWeeks.slice(windowSize, windowSize * 2),
    [archivedWeeks, windowSize],
  );

  const [recentByWeek, setRecentByWeek] = useState<Record<string, Record<string, MemberSnapshot>>>({});
  const [priorByWeek, setPriorByWeek] = useState<Record<string, Record<string, MemberSnapshot>>>({});
  const [loading, setLoading] = useState(false);

  const recentIds = recentWindow.map((w) => w.weekId).join("|");
  const priorIds = priorWindow.map((w) => w.weekId).join("|");

  const load = useCallback(async () => {
    setLoading(true);
    const all = [...recentWindow, ...priorWindow];
    const results = await Promise.all(all.map((w) => fetchWeekSnapshot(w.weekId)));
    const recent: Record<string, Record<string, MemberSnapshot>> = {};
    const prior: Record<string, Record<string, MemberSnapshot>> = {};
    recentWindow.forEach((w, i) => {
      recent[w.weekId] = results[i];
    });
    priorWindow.forEach((w, i) => {
      prior[w.weekId] = results[recentWindow.length + i];
    });
    setRecentByWeek(recent);
    setPriorByWeek(prior);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentIds, priorIds]);

  useEffect(() => {
    load();
  }, [load]);

  const hasFullWindows = archivedWeeks.length >= windowSize * 2;

  const byMember = useMemo<Record<string, MemberWindowAverage>>(() => {
    if (!hasFullWindows) return {};

    const recentMaxAvg =
      recentWindow.reduce((s, w) => s + BASE_MAX_POINTS + getEventMaxForWeek(w.weekId), 0) /
      recentWindow.length;
    const priorMaxAvg =
      priorWindow.reduce((s, w) => s + BASE_MAX_POINTS + getEventMaxForWeek(w.weekId), 0) /
      priorWindow.length;

    const memberIds = new Set<string>();
    for (const w of recentWindow) for (const id of Object.keys(recentByWeek[w.weekId] ?? {})) memberIds.add(id);
    for (const w of priorWindow) for (const id of Object.keys(priorByWeek[w.weekId] ?? {})) memberIds.add(id);

    const out: Record<string, MemberWindowAverage> = {};
    for (const id of memberIds) {
      let rSum = 0, rCount = 0, pSum = 0, pCount = 0;
      let leadership: "R4" | "R5" | null = null;
      for (const w of recentWindow) {
        const snap = recentByWeek[w.weekId]?.[id];
        if (!snap) continue;
        rSum += snap.totalScore;
        rCount += 1;
        if (!leadership && snap.leadershipRank) leadership = snap.leadershipRank;
      }
      for (const w of priorWindow) {
        const snap = priorByWeek[w.weekId]?.[id];
        if (!snap) continue;
        pSum += snap.totalScore;
        pCount += 1;
        if (!leadership && snap.leadershipRank) leadership = snap.leadershipRank;
      }
      if (rCount === 0 || pCount === 0) continue;
      const recentAvgScore = rSum / rCount;
      const priorAvgScore = pSum / pCount;
      const leadershipForRank = leadership ?? undefined;
      out[id] = {
        recentAvgScore,
        priorAvgScore,
        recentRank: getRank(recentAvgScore, leadershipForRank, thresholds, recentMaxAvg),
        priorRank: getRank(priorAvgScore, leadershipForRank, thresholds, priorMaxAvg),
        recentCount: rCount,
        priorCount: pCount,
        leadershipRank: leadership,
      };
    }
    return out;
  }, [hasFullWindows, recentWindow, priorWindow, recentByWeek, priorByWeek, BASE_MAX_POINTS, getEventMaxForWeek, thresholds]);

  return {
    recentWindow,
    priorWindow,
    byMember,
    hasFullWindows,
    archivedCount: archivedWeeks.length,
    windowSize,
    loading,
    refresh: load,
  };
}

