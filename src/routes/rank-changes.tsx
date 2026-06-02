import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMembers } from "@/hooks/use-members";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useEventTypes } from "@/hooks/use-event-types";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { useEventScoring } from "@/hooks/use-event-scoring";
import {
  calculateEventPoints,
  calculateTotalScore,
  getRank,
  type EventPointSource,
  type Rank,
} from "@/lib/scoring";

export const Route = createFileRoute("/rank-changes")({
  component: RankChangesPage,
  head: () => ({
    meta: [
      { title: "Weekly Rank Changes | Last Z Alliance Manager" },
      { name: "description", content: "Members whose rank tier changed between last week and this week" },
    ],
  }),
});

const RANK_ORDER: Rank[] = ["R1", "R2", "R3", "R4", "R5"];
function rankIndex(r: Rank): number {
  return RANK_ORDER.indexOf(r);
}

interface PriorSnapshot {
  metrics: Record<string, number | boolean | string>;
  leadershipRank?: "R4" | "R5" | null;
}

function RankChangesPage() {
  const { members } = useMembers();
  const { maxTotal: BASE_MAX_POINTS } = useScoringConfig();
  const { thresholds } = useRankThresholds();
  const { eventTypes } = useEventTypes();
  const { activeWeeks, archivedWeeks, isEventActive, getStatus, getValue } = useWeeklyEvents();
  const { getEventPoints, eventMaxThisWeek } = useEventScoring();

  const currentWeek = activeWeeks[0] ?? null;
  // "Previous week" for live event-bonus comparison: the next-most-recent week
  // (active or archived) before the current one.
  const priorWeek = useMemo(() => {
    const all = [...activeWeeks, ...archivedWeeks].sort((a, b) =>
      a.weekId < b.weekId ? 1 : -1,
    );
    if (!currentWeek) return null;
    const idx = all.findIndex((w) => w.weekId === currentWeek.weekId);
    return idx >= 0 ? all[idx + 1] ?? null : all[0] ?? null;
  }, [activeWeeks, archivedWeeks, currentWeek]);

  // Snapshots captured at the moment current week started — i.e. end of
  // previous week. source = 'auto_weekly', week_id = currentWeek.weekId.
  const [priorSnapshots, setPriorSnapshots] = useState<Record<string, PriorSnapshot>>({});
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!currentWeek) {
      setPriorSnapshots({});
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("member_metrics_history")
        .select("member_id,metrics,leadership_rank,recorded_at")
        .eq("week_id", currentWeek.weekId)
        .eq("source", "auto_weekly")
        .order("recorded_at", { ascending: false });
      if (cancelled) return;
      const map: Record<string, PriorSnapshot> = {};
      for (const row of data ?? []) {
        if (map[row.member_id]) continue; // keep latest only
        map[row.member_id] = {
          metrics: (row.metrics ?? {}) as Record<string, number | boolean | string>,
          leadershipRank: (row.leadership_rank as "R4" | "R5" | null) ?? null,
        };
      }
      setPriorSnapshots(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentWeek?.weekId, reloadKey]);

  // Prior-week event bonus per member (live, computed from prior week's attendance).
  const getPriorEventPoints = useMemo(() => {
    if (!priorWeek) return (_memberId: string) => ({ earned: 0, max: 0 });
    return (memberId: string) => {
      const sources: EventPointSource[] = eventTypes.map((e) => ({
        key: e.key,
        inputType: e.inputType,
        pointWeight: e.pointWeight ?? 1,
        isActive: isEventActive(priorWeek.weekId, e.key),
        status: getStatus(priorWeek.weekId, memberId, e.key),
        value: getValue(priorWeek.weekId, memberId, e.key),
      }));
      return calculateEventPoints(sources);
    };
  }, [priorWeek, eventTypes, isEventActive, getStatus, getValue]);

  const rows = useMemo(() => {
    if (!currentWeek) return [];
    const out: Array<{
      id: string;
      name: string;
      leadershipRank?: "R4" | "R5";
      previousRank: Rank;
      currentRank: Rank;
      direction: "up" | "down";
      delta: number;
    }> = [];

    for (const m of members) {
      const snap = priorSnapshots[m.id];
      if (!snap) continue; // no baseline → skip

      // Previous rank: snapshot metrics + prior-week event bonus
      const prevBase = calculateTotalScore(snap.metrics);
      const prevEv = getPriorEventPoints(m.id);
      const prevScore = prevBase + prevEv.earned;
      const prevMax = BASE_MAX_POINTS + prevEv.max;
      const previousRank = getRank(
        prevScore,
        snap.leadershipRank ?? undefined,
        thresholds,
        prevMax,
      );

      // Current rank: live metrics + current-week event bonus
      const curBase = calculateTotalScore(m.metrics);
      const curEv = getEventPoints(m.id);
      const curScore = curBase + curEv.earned;
      const curMax = BASE_MAX_POINTS + curEv.max;
      const currentRank = getRank(
        curScore,
        m.leadershipRank,
        thresholds,
        curMax,
      );

      if (previousRank === currentRank) continue;

      const delta = rankIndex(currentRank) - rankIndex(previousRank);
      out.push({
        id: m.id,
        name: m.name,
        leadershipRank: m.leadershipRank,
        previousRank,
        currentRank,
        direction: delta > 0 ? "up" : "down",
        delta,
      });
    }

    out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));
    return out;
  }, [members, priorSnapshots, getPriorEventPoints, getEventPoints, BASE_MAX_POINTS, thresholds, currentWeek]);

  const promotions = rows.filter((r) => r.direction === "up").length;
  const demotions = rows.filter((r) => r.direction === "down").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">
              Weekly Rank Changes
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {currentWeek && priorWeek
                ? <>Comparing <span className="text-foreground">{priorWeek.label}</span> <ArrowRight className="inline h-3 w-3" /> <span className="text-foreground">{currentWeek.label}</span> · max {BASE_MAX_POINTS + eventMaxThisWeek} pts</>
                : "Live comparison of last week's final rank to this week's current rank."}
            </p>
          </div>
          <Button
            variant="outline"
            className="border-gold/30 text-gold hover:bg-gold/10"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {!currentWeek ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Start a new week on the Events page to begin tracking rank changes.
            </CardContent>
          </Card>
        ) : !priorWeek ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Need at least one previous week to compare.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Members changed</CardDescription>
                  <CardTitle className="font-heading text-2xl text-gold">{rows.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Promotions</CardDescription>
                  <CardTitle className="font-heading text-2xl text-emerald-400 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> {promotions}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Demotions</CardDescription>
                  <CardTitle className="font-heading text-2xl text-destructive flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" /> {demotions}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-gold">Rank Movement</CardTitle>
                <CardDescription>
                  Only members whose rank tier changed are listed. Updates live as events and member profiles change.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No rank changes this week yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Previous</TableHead>
                        <TableHead></TableHead>
                        <TableHead>Current</TableHead>
                        <TableHead className="text-right">Change</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-foreground">{r.name}</span>
                              {r.leadershipRank && (
                                <Badge variant="outline" className="text-xs text-gold-muted border-gold-muted">
                                  {r.leadershipRank}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><RankBadge rank={r.previousRank} /></TableCell>
                          <TableCell><ArrowRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                          <TableCell><RankBadge rank={r.currentRank} /></TableCell>
                          <TableCell className="text-right">
                            {r.direction === "up" ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                <TrendingUp className="h-3 w-3" /> Promoted
                                {Math.abs(r.delta) > 1 && ` +${Math.abs(r.delta)}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                                <TrendingDown className="h-3 w-3" /> Demoted
                                {Math.abs(r.delta) > 1 && ` -${Math.abs(r.delta)}`}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
