import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useMembers } from "@/hooks/use-members";
import { useArchivedSnapshot } from "@/hooks/use-archived-snapshot";
import { type Rank } from "@/lib/scoring";

export const Route = createFileRoute("/rank-changes")({
  component: RankChangesPage,
  head: () => ({
    meta: [
      { title: "Weekly Rank Changes | Last Z Alliance Manager" },
      { name: "description", content: "Members whose rank tier changed between the last two archived weeks" },
    ],
  }),
});

const RANK_ORDER: Rank[] = ["R1", "R2", "R3", "R4", "R5"];
function rankIndex(r: Rank): number {
  return RANK_ORDER.indexOf(r);
}

function RankChangesPage() {
  const { members } = useMembers();
  const {
    latest,
    previous,
    latestByMember,
    previousByMember,
    hasTwoArchives,
    loading,
  } = useArchivedSnapshot();

  const rows = useMemo(() => {
    if (!hasTwoArchives) return [];
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
      const prev = previousByMember[m.id];
      const cur = latestByMember[m.id];
      if (!prev || !cur) continue;
      const previousRank = (prev.rank as Rank | null) ?? "R1";
      const currentRank = (cur.rank as Rank | null) ?? "R1";
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
  }, [members, latestByMember, previousByMember, hasTwoArchives]);

  const promotions = rows.filter((r) => r.direction === "up").length;
  const demotions = rows.filter((r) => r.direction === "down").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">
            Weekly Rank Changes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasTwoArchives && latest && previous
              ? <>Comparing <span className="text-foreground">{previous.label}</span> <ArrowRight className="inline h-3 w-3" /> <span className="text-foreground">{latest.label}</span></>
              : "Comparison of the two most recent archived weeks."}
          </p>
        </div>

        {!hasTwoArchives ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              {loading ? "Loading…" : "Need at least 2 archived weeks to compare. Archive a week from the Events page."}
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
                  Only members whose rank tier changed between the two most recent archived weeks are listed.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No rank changes between these two weeks.
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
