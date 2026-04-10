import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { MOCK_MEMBERS } from "@/lib/mock-data";
import { calculateTotalScore, getRank, METRIC_DEFINITIONS, calculateMetricPoints, MAX_TOTAL_POINTS, type Rank } from "@/lib/scoring";
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
  const membersWithScores = MOCK_MEMBERS.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank);
    const breakdown = METRIC_DEFINITIONS.map((def) => ({
      metric: def.name,
      maxPoints: def.maxPoints,
      points: m.metrics[def.key] !== undefined ? calculateMetricPoints(def, m.metrics[def.key]) : 0,
    }));
    return { ...m, score, rank, breakdown };
  }).sort((a, b) => b.score - a.score);

  const ranks: Rank[] = ["R5", "R4", "R3", "R2", "R1"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Rankings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Class rankings based on scored metrics · Max {MAX_TOTAL_POINTS} points</p>
        </div>

        {/* Rank Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Rank Thresholds</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-3">
              {[
                { rank: "R1" as Rank, desc: "≤14 points" },
                { rank: "R2" as Rank, desc: "15-25 points" },
                { rank: "R3" as Rank, desc: "26+ points" },
                { rank: "R4" as Rank, desc: "Officer (override)" },
                { rank: "R5" as Rank, desc: "Leader (override)" },
              ].map((r) => (
                <div key={r.rank} className="flex flex-col items-center gap-2 rounded-lg bg-secondary/50 p-4">
                  <RankBadge rank={r.rank} className="text-sm" />
                  <span className="text-xs text-muted-foreground text-center">{r.desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Members by Rank */}
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
                          <span className="text-sm text-muted-foreground">/{MAX_TOTAL_POINTS}</span>
                        </div>
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
