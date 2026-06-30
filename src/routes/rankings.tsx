import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { useMembers } from "@/hooks/use-members";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { calculateMetricPoints, calculateInterimScore, getRank, type Rank } from "@/lib/scoring";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useArchivedSnapshot } from "@/hooks/use-archived-snapshot";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/rankings")({
  component: RankingsPage,
  head: () => ({
    meta: [
      { title: "Rankings | Last Z Alliance Manager" },
      { name: "description", content: "View alliance member rankings and scoring breakdown" },
    ],
  }),
});

function RankingsPage() {
  const { members } = useMembers();
  const { metrics: METRIC_DEFINITIONS } = useScoringConfig();
  const { thresholds } = useRankThresholds();
  const { latest, latestByMember, latestMax, hasArchive, loading } = useArchivedSnapshot();

  const ranks: Rank[] = ["R5", "R4", "R3", "R2", "R1"];

  if (!hasArchive) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Rankings</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Class rankings based on the last completed week's final scores.
            </p>
          </div>
          <Card>
            <CardContent className="p-10 text-center text-muted-foreground">
              {loading ? "Loading…" : "No completed week yet — archive a week from the Events page to see rankings."}
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const membersWithScores = members
    .map((m) => {
      const snap = latestByMember[m.id];
      const interim = !snap ? calculateInterimScore(m.metrics) : null;
      const score = snap?.totalScore ?? interim?.earned ?? 0;
      const scoreMax = snap ? latestMax : interim?.max ?? 0;
      const rank: Rank = snap
        ? ((snap.rank as Rank | null) ?? "R1")
        : getRank(interim?.earned ?? 0, m.leadershipRank as Rank | undefined, thresholds, interim?.max);
      const metricsForBreakdown = snap?.metrics ?? m.metrics;
      const breakdown = METRIC_DEFINITIONS.map((def) => ({
        metric: def.name,
        maxPoints: def.maxPoints,
        points:
          metricsForBreakdown[def.key] !== undefined
            ? calculateMetricPoints(def, metricsForBreakdown[def.key])
            : 0,
      }));
      return { ...m, score, scoreMax, rank, breakdown, hasSnap: !!snap, interim: !snap };
    })
    .sort((a, b) => {
      const aPct = a.scoreMax ? a.score / a.scoreMax : 0;
      const bPct = b.scoreMax ? b.score / b.scoreMax : 0;
      return bPct - aPct;
    });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Rankings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Final scores from <span className="text-foreground">{latest?.label}</span> · Max {latestMax} points
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Rank Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {(() => {
                const r1 = thresholds.find(t => t.rankKey === "R1");
                const r2 = thresholds.find(t => t.rankKey === "R2");
                const r3 = thresholds.find(t => t.rankKey === "R3");
                return [
                  { rank: "R1" as Rank, desc: r1 && r1.maxPercent !== null ? `≤${r1.maxPercent}%` : "<50%" },
                  { rank: "R2" as Rank, desc: r2 && r2.maxPercent !== null ? `${r2.minPercent}–${r2.maxPercent}%` : "50–84.99%" },
                  { rank: "R3" as Rank, desc: r3 ? `${r3.minPercent}%+` : "85%+" },
                  { rank: "R4" as Rank, desc: "Officer (override)" },
                  { rank: "R5" as Rank, desc: "Leader (override)" },
                ];
              })().map((r) => (
                <div key={r.rank} className="flex flex-col items-center gap-2 rounded-lg bg-secondary/50 p-4">
                  <RankBadge rank={r.rank} className="text-sm" />
                  <span className="text-xs text-muted-foreground text-center">{r.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="all">
          <TabsList className="bg-secondary">
            <TabsTrigger value="all">All</TabsTrigger>
            {ranks.map((r) => (
              <TabsTrigger key={r} value={r}>{r}</TabsTrigger>
            ))}
          </TabsList>

          {["all", ...ranks].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {membersWithScores
                .filter((m) => tab === "all" || m.rank === tab)
                .map((m, i) => (
                  <Card key={m.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center font-heading text-sm font-bold text-gold-muted">#{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-foreground">{m.name}</span>
                            <RankBadge rank={m.rank} />
                            {m.interim && (
                              <span className="rounded border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gold">
                                Interim
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {m.breakdown.map((b) => (
                              <span
                                key={b.metric}
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs ${
                                  b.points === b.maxPoints
                                    ? "bg-gold/20 text-gold"
                                    : b.points > 0
                                    ? "bg-secondary text-muted-foreground"
                                    : "bg-secondary/30 text-muted-foreground/50"
                                }`}
                                title={`${b.metric}: ${b.points}/${b.maxPoints}`}
                              >
                                {b.points}/{b.maxPoints}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-gold">{m.score}</span>
                          <span className="text-sm text-muted-foreground">/{m.scoreMax}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
                    </CardContent>
                  </Card>
                ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AppLayout>
  );
}
