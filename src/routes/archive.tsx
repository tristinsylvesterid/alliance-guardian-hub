import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RankBadge } from "@/components/RankBadge";
import { calculateTotalScore, getRank } from "@/lib/scoring";
import { useArchivedMembers } from "@/hooks/use-archived-members";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { useMembers } from "@/hooks/use-members";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";
import type { ArchivedMember } from "@/lib/mock-data";

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
  const { archivedMembers, unarchiveMember } = useArchivedMembers();
  const { thresholds } = useRankThresholds();
  const { metrics: liveMetrics, maxTotal } = useScoringConfig();
  const { members, refetch } = useMembers();
  const [restoreTarget, setRestoreTarget] = useState<ArchivedMember | null>(null);
  const [restoring, setRestoring] = useState(false);

  async function handleRestore() {
    if (!restoreTarget) return;
    setRestoring(true);
    try {
      const conflict = restoreTarget.originalMemberId
        ? members.some((m) => m.id === restoreTarget.originalMemberId)
        : false;
      if (conflict) {
        toast.error("A member with the same ID already exists in the active roster.");
        return;
      }
      await unarchiveMember(restoreTarget);
      await refetch();
      toast.success(`${restoreTarget.name} restored to active roster`);
      setRestoreTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to restore member");
    } finally {
      setRestoring(false);
    }
  }

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
                      <TableHead className="text-gold-muted font-heading text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {archivedMembers.map((entry) => {
                      const score = calculateTotalScore(entry.metrics, liveMetrics);
                      const rank = getRank(score, entry.leadershipRank as "R4" | "R5" | undefined, thresholds, maxTotal);
                      return (
                        <TableRow key={entry.id} className="border-border/50">
                          <TableCell className="font-medium text-foreground">{entry.name}</TableCell>
                          <TableCell><RankBadge rank={rank} /></TableCell>
                          <TableCell className="text-center font-bold text-gold">{score}</TableCell>
                          <TableCell className="text-muted-foreground max-w-xs truncate">{entry.reason}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {new Date(entry.archivedAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5"
                              onClick={() => setRestoreTarget(entry)}
                            >
                              <ArchiveRestore className="h-3.5 w-3.5" />
                              Unarchive
                            </Button>
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

      <AlertDialog open={!!restoreTarget} onOpenChange={(v) => { if (!v && !restoring) setRestoreTarget(null); }}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-heading text-gold">Restore Member</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Restore <span className="font-semibold text-foreground">{restoreTarget?.name}</span> to the active roster? Their last-known stats will be brought back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={restoring}>
              {restoring ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
