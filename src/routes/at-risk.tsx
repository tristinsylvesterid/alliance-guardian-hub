import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { useMembers } from "@/hooks/use-members";
import { useEventTypes } from "@/hooks/use-event-types";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { useWeeklyPolls } from "@/hooks/use-weekly-polls";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { calculateTotalScore, getRank, MAX_TOTAL_POINTS } from "@/lib/scoring";
import { useEventScoring } from "@/hooks/use-event-scoring";
import {
  evaluateMemberRisk,
  severityRank,
  severityClasses,
  type RiskFlag,
} from "@/lib/at-risk";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/at-risk")({
  component: AtRiskPage,
  head: () => ({
    meta: [
      { title: "Members at Risk | nOva Alliance Manager" },
      { name: "description", content: "Identify low-performing alliance members across key indicators" },
    ],
  }),
});

function AtRiskPage() {
  const { members } = useMembers();
  const { eventTypes } = useEventTypes();
  const { activeWeeks, getStatus, getValue, isEventActive } = useWeeklyEvents();
  const { getPollsForWeek, getResponse } = useWeeklyPolls();
  const { thresholds } = useRankThresholds();
  const [filter, setFilter] = useState<string | null>(null);

  const currentWeek = activeWeeks[0];

  const flaggedMembers = useMemo(() => {
    if (!currentWeek) return [];

    const activeEvents = eventTypes.filter((e) => isEventActive(currentWeek.weekId, e.key));
    const polls = getPollsForWeek(currentWeek.id);
    const svsActive = isEventActive(currentWeek.weekId, "svs");
    const avaActive = isEventActive(currentWeek.weekId, "ava");

    return members
      .filter((m) => m.leadershipRank !== "R4" && m.leadershipRank !== "R5")
      .map((m) => {
        let attended = 0;
        for (const ev of activeEvents) {
          if (getStatus(currentWeek.weekId, m.id, ev.key) === "check") attended++;
        }
        const pollResponses = polls.reduce(
          (n, p) => n + (getResponse(p.id, m.id) ? 1 : 0),
          0,
        );
        const svsAttended = getStatus(currentWeek.weekId, m.id, "svs") === "check";
        const avaRank = getValue(currentWeek.weekId, m.id, "ava");

        const flags = evaluateMemberRisk(m, {
          activeEventCount: activeEvents.length,
          attendedEventCount: attended,
          pollCount: polls.length,
          pollResponseCount: pollResponses,
          svsActive,
          svsAttended,
          avaActive,
          avaRank,
        });

        const score = calculateTotalScore(m.metrics);
        const rank = getRank(score, m.leadershipRank, thresholds);
        return { ...m, flags, score, rank, attended, totalOpps: activeEvents.length + polls.length };
      })
      .filter((m) => m.flags.length > 0)
      .sort((a, b) => {
        const aHigh = a.flags.filter((f) => f.severity === "high").length;
        const bHigh = b.flags.filter((f) => f.severity === "high").length;
        if (bHigh !== aHigh) return bHigh - aHigh;
        if (b.flags.length !== a.flags.length) return b.flags.length - a.flags.length;
        return a.name.localeCompare(b.name);
      });
  }, [members, eventTypes, currentWeek, isEventActive, getStatus, getValue, getPollsForWeek, getResponse, thresholds]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of flaggedMembers) {
      for (const f of m.flags) map[f.key] = (map[f.key] ?? 0) + 1;
    }
    return map;
  }, [flaggedMembers]);

  const visible = filter
    ? flaggedMembers.filter((m) => m.flags.some((f) => f.key === filter))
    : flaggedMembers;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Members at Risk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Underperformance flags from the current week
            {currentWeek ? ` (${currentWeek.label})` : ""} and member profiles. Officers (R4/R5) are excluded.
          </p>
        </div>

        {!currentWeek ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              Start a new week on the Events page to see at-risk indicators.
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8">
              {Object.entries(counts).length === 0 && (
                <div className="col-span-full rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                  No flags this week.
                </div>
              )}
              {Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const sample = flaggedMembers
                    .flatMap((m) => m.flags)
                    .find((f) => f.key === key);
                  const isActive = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(isActive ? null : key)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors ${
                        isActive
                          ? "border-gold bg-gold/10"
                          : "border-border bg-card hover:border-gold/50"
                      }`}
                    >
                      <div className="font-heading text-xs text-gold truncate">{sample?.label ?? key}</div>
                      <div className="mt-1 text-lg font-bold text-foreground">{count}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        flagged
                      </div>
                    </button>
                  );
                })}
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="font-heading text-gold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {filter ? `Filtered: ${visible.length}` : `${flaggedMembers.length} flagged members`}
                </CardTitle>
                {filter && (
                  <button
                    type="button"
                    onClick={() => setFilter(null)}
                    className="text-xs text-muted-foreground hover:text-gold"
                  >
                    Clear filter
                  </button>
                )}
              </CardHeader>
              <CardContent>
                {visible.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nobody matches this view. Nice.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead className="w-20">Rank</TableHead>
                        <TableHead className="w-24">Score</TableHead>
                        <TableHead className="w-20">Flags</TableHead>
                        <TableHead>Indicators</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visible.map((m) => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.name}</TableCell>
                          <TableCell><RankBadge rank={m.rank} /></TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="text-gold font-semibold">{m.score}</span>
                            <span className="text-xs">/{MAX_TOTAL_POINTS}</span>
                          </TableCell>
                          <TableCell>
                            <span className="font-heading text-sm text-gold">{m.flags.length}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {[...m.flags]
                                .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
                                .map((f: RiskFlag, i) => (
                                  <span
                                    key={`${f.key}-${i}`}
                                    className={`inline-flex items-center rounded border px-2 py-0.5 text-[11px] ${severityClasses(f.severity)}`}
                                    title={f.detail}
                                  >
                                    {f.label}
                                    {f.detail ? <span className="ml-1 opacity-70">· {f.detail}</span> : null}
                                  </span>
                                ))}
                            </div>
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
