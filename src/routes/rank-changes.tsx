import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useArchivedWindowAverages } from "@/hooks/use-archived-snapshot";
import { type Rank } from "@/lib/scoring";

export const Route = createFileRoute("/rank-changes")({
  component: RankChangesPage,
  head: () => ({
    meta: [
      { title: "Weekly Rank Changes | Last Z Alliance Manager" },
      { name: "description", content: "Members whose rank tier changed between the last two 4-week windows" },
    ],
  }),
});

const RANK_ORDER: Rank[] = ["R1", "R2", "R3", "R4", "R5"];
function rankIndex(r: Rank): number {
  return RANK_ORDER.indexOf(r);
}

const WINDOW = 4;

function RankChangesPage() {
  const { members } = useMembers();
  const {
    recentWindow,
    priorWindow,
    byMember,
    hasFullWindows,
    archivedCount,
    loading,
  } = useArchivedWindowAverages(WINDOW);

  const rows = useMemo(() => {
    if (!hasFullWindows) return [];
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
      const entry = byMember[m.id];
      if (!entry) continue;
      if (entry.priorRank === entry.recentRank) continue;
      const delta = rankIndex(entry.recentRank) - rankIndex(entry.priorRank);
      out.push({
        id: m.id,
        name: m.name,
        leadershipRank: m.leadershipRank,
        previousRank: entry.priorRank,
        currentRank: entry.recentRank,
        direction: delta > 0 ? "up" : "down",
        delta,
      });
    }

    out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));
    return out;
  }, [members, byMember, hasFullWindows]);

  const promotions = rows.filter((r) => r.direction === "up").length;
  const demotions = rows.filter((r) => r.direction === "down").length;

  const recentLabel =
    recentWindow.length > 0
      ? `${recentWindow[recentWindow.length - 1].label} – ${recentWindow[0].label}`
      : "";
  const priorLabel =
    priorWindow.length > 0
      ? `${priorWindow[priorWindow.length - 1].label} – ${priorWindow[0].label}`
      : "";

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">
            Weekly Rank Changes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFullWindows
              ? <>Comparing prior 4-week avg <span className="text-foreground">{priorLabel}</span> <ArrowRight className="inline h-3 w-3" /> recent 4-week avg <span className="text-foreground">{recentLabel}</span></>
              : `Rolling 4-week average vs the previous 4-week average.`}
          </p>
        </div>

        {!hasFullWindows ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {loading
                ? "Loading…"
                : `Need at least ${WINDOW * 2} archived weeks to compare rolling 4-week averages. You have ${archivedCount}.`}
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
                  Only members whose averaged rank tier changed between the two 4-week windows are listed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No rank changes between these two windows.
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
