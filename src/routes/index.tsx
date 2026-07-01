import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { useEventTypes } from "@/hooks/use-event-types";
import { useMembers } from "@/hooks/use-members";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { calculateInterimScore, getRank, type Rank } from "@/lib/scoring";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useArchivedSnapshot } from "@/hooks/use-archived-snapshot";
import { Users, Trophy, Calendar, TrendingUp, Minus } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard | nOva Alliance Manager" },
      { name: "description", content: "Alliance overview and key stats" },
    ],
  }),
});

function Dashboard() {
  const { members: rawMembers } = useMembers();
  const { eventTypes } = useEventTypes();
  const { currentWeek, getStatus } = useWeeklyEvents();
  const { latest, latestMax, hasArchive, loading, getDisplayFor } = useArchivedSnapshot();
  useRankThresholds();

  const total = rawMembers.length;

  const membersWithScores = rawMembers.map((m) => {
    const d = getDisplayFor(m);
    return { ...m, ...d };
  }).sort((a, b) => {
    const aPct = a.scoreMax ? a.score / a.scoreMax : 0;
    const bPct = b.scoreMax ? b.score / b.scoreMax : 0;
    return bPct - aPct;
  });

  const rankCounts: Record<Rank, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
  membersWithScores.forEach((m) => {
    rankCounts[m.rank]++;
  });

  const snapMembers = membersWithScores.filter((m) => m.hasSnap);
  const avgScore = snapMembers.length
    ? Math.round(snapMembers.reduce((s, m) => s + m.score, 0) / snapMembers.length)
    : 0;

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasArchive
              ? <>Showing final scores from <span className="text-foreground">{latest?.label}</span></>
              : "Alliance overview · archive a week to populate rankings"}
          </p>
        </div>

        {!hasArchive ? (
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {loading ? "Loading…" : "No completed week yet — archive a week from the Events page to see scores here."}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{avgScore} <span className="text-sm text-muted-foreground">/ {latestMax}</span></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">R3 Members</CardTitle>
                  <Trophy className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{rankCounts.R3}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Events Tracked</CardTitle>
                  <Calendar className="h-4 w-4 text-gold" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{eventTypes.length}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg text-gold">Rank Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(["R5", "R4", "R3", "R2", "R1"] as Rank[]).map((rank) => (
                      <div key={rank} className="flex items-center gap-3">
                        <RankBadge rank={rank} className="w-12 justify-center" />
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-secondary">
                            <div
                              className="h-2 rounded-full bg-gold transition-all"
                              style={{ width: `${membersWithScores.length ? (rankCounts[rank] / membersWithScores.length) * 100 : 0}%` }}
                            />
                          </div>
                        </div>
                        <span className="w-8 text-right text-sm font-medium text-foreground">{rankCounts[rank]}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="font-heading text-lg text-gold">
                    Event Attendance
                    {currentWeek && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        {currentWeek.label} · live
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {eventTypes.map((e) => {
                      const isSvsOff = e.key === "svs" && currentWeek && !currentWeek.svsActive;
                      const count = currentWeek
                        ? (isSvsOff ? 0 : rawMembers.filter((m) => getStatus(currentWeek.weekId, m.id, e.key) === "check").length)
                        : 0;

                      return (
                        <div key={e.key} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">{e.name}</span>
                          {isSvsOff ? (
                            <div className="flex items-center gap-2">
                              <Minus className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">N/A</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-32 rounded-full bg-secondary">
                                <div
                                  className="h-2 rounded-full bg-gold transition-all"
                                  style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">{count}/{total}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg text-gold">Top Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {membersWithScores.slice(0, 10).map((m, i) => (
                    <div key={m.id} className="flex items-center gap-4 rounded-lg bg-secondary/50 px-4 py-3">
                      <span className="w-6 text-center font-heading text-sm font-bold text-gold-muted">#{i + 1}</span>
                      <span className="flex-1 font-medium text-foreground">{m.name}</span>
                      <RankBadge rank={m.rank} />
                      {m.interim && (
                        <span className="rounded border border-gold/30 bg-gold/10 px-1 py-0.5 text-[9px] uppercase tracking-wide text-gold">
                          Interim
                        </span>
                      )}
                      <span className="w-20 text-right text-sm text-muted-foreground">{m.score}<span className="text-xs">/{m.scoreMax}</span></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
