import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { calculateTotalScore, getRank } from "@/lib/scoring";
import { useArchivedMembers } from "@/hooks/use-archived-members";
import { Archive } from "lucide-react";

export const Route = createFileRoute("/archive")({
  component: ArchivePage,
  head: () => ({
    meta: [
      { title: "Archive | nOva Alliance Manager" },
      { name: "description", content: "Archived alliance members" },
    ],
  }),
});

function ArchivePage() {
  const { archivedMembers } = useArchivedMembers();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Archive</h1>
          <p className="mt-1 text-sm text-muted-foreground">Members removed from the active roster</p>
        </div>

        {archivedMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Archive className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg text-muted-foreground">No archived members</p>
              <p className="text-sm text-muted-foreground/60">Archived members will appear here</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-gold-muted font-heading">Name</TableHead>
                      <TableHead className="text-gold-muted font-heading">Last Rank</TableHead>
                      <TableHead className="text-gold-muted font-heading text-center">Last Score</TableHead>
                      <TableHead className="text-gold-muted font-heading">Reason</TableHead>
                      <TableHead className="text-gold-muted font-heading">Archived On</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedMembers.map((entry) => {
                      const score = calculateTotalScore(entry.member.metrics);
                      const rank = getRank(score, entry.member.leadershipRank);
                      return (
                        <TableRow key={entry.member.id} className="border-border/50">
                          <TableCell className="font-medium text-foreground">{entry.member.name}</TableCell>
                          <TableCell><RankBadge rank={rank} /></TableCell>
                          <TableCell className="text-center font-bold text-gold">{score}</TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{entry.reason}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(entry.archivedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
