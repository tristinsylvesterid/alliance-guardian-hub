import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RankBadge } from "@/components/RankBadge";
import { MOCK_MEMBERS, EVENT_TYPES } from "@/lib/mock-data";
import { calculateTotalScore, getRank, METRIC_DEFINITIONS, MAX_TOTAL_POINTS, type Rank } from "@/lib/scoring";
import { Users, Trophy, Calendar, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard | Last Z Alliance Manager" },
      { name: "description", content: "Alliance overview and key stats for Last Z Survival Shooter" },
    ],
  }),
});

function Dashboard() {
  const membersWithScores = MOCK_MEMBERS.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank);
    return { ...m, score, rank };
  }).sort((a, b) => b.score - a.score);

  const rankCounts: Record<Rank, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
  membersWithScores.forEach((m) => rankCounts[m.rank]++);

  const avgScore = Math.round(membersWithScores.reduce((s, m) => s + m.score, 0) / membersWithScores.length);

  const eventAttendance = EVENT_TYPES.map((e) => ({
    ...e,
    count: MOCK_MEMBERS.filter((m) => m.events[e.key]).length,
  }));

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Alliance overview and key metrics</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
              <Users className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{MOCK_MEMBERS.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{avgScore} <span className="text-sm text-muted-foreground">/ {MAX_TOTAL_POINTS}</span></div>
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
              <div className="text-2xl font-bold text-foreground">{EVENT_TYPES.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Rank Distribution & Event Attendance */}
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
                          style={{ width: `${(rankCounts[rank] / MOCK_MEMBERS.length) * 100}%` }}
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
              <CardTitle className="font-heading text-lg text-gold">Event Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventAttendance.map((e) => (
                  <div key={e.key} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{e.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-32 rounded-full bg-secondary">
                        <div
                          className="h-2 rounded-full bg-gold transition-all"
                          style={{ width: `${(e.count / MOCK_MEMBERS.length) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{e.count}/{MOCK_MEMBERS.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Members */}
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
                  <span className="w-16 text-right text-sm text-muted-foreground">{m.score} pts</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
