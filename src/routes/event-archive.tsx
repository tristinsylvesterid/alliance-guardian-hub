import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RankBadge } from "@/components/RankBadge";
import { useEventTypes } from "@/hooks/use-event-types";
import { useMembers } from "@/hooks/use-members";
import { useWeeklyEvents, type EventStatus } from "@/hooks/use-weekly-events";
import { calculateTotalScore, getRank } from "@/lib/scoring";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { Check, X, Minus, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/event-archive")({
  component: EventArchivePage,
  head: () => ({
    meta: [
      { title: "Event Archive | nOva Alliance Manager" },
      { name: "description", content: "Browse past weekly event attendance records" },
    ],
  }),
});

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === "check") return <Check className="inline h-4 w-4 text-gold" />;
  if (status === "na") return <Minus className="inline h-4 w-4 text-muted-foreground" />;
  return <X className="inline h-4 w-4 text-destructive/60" />;
}

function EventArchivePage() {
  const { members: rawMembers } = useMembers();
  const { eventTypes } = useEventTypes();
  const { archivedWeeks, getStatus } = useWeeklyEvents();
  const { thresholds } = useRankThresholds();
  const { metrics: liveMetrics, maxTotal } = useScoringConfig();
  const [selectedWeekId, setSelectedWeekId] = useState(archivedWeeks[0]?.weekId ?? "");

  const selectedWeek = archivedWeeks.find((w) => w.weekId === selectedWeekId);

  const members = rawMembers.map((m) => {
    const score = calculateTotalScore(m.metrics, liveMetrics);
    const rank = getRank(score, m.leadershipRank, thresholds, maxTotal);
    return { ...m, score, rank };
  });

  if (archivedWeeks.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Event Archive</h1>
            <p className="mt-1 text-sm text-muted-foreground">Past weekly attendance records</p>
          </div>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <CalendarClock className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No archived weeks yet.</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Older weeks will appear here as new weeks are started.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Event Archive</h1>
            <p className="mt-1 text-sm text-muted-foreground">Browse past weekly attendance records</p>
          </div>
          <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
            <SelectTrigger className="w-[260px] border-border bg-card text-foreground">
              <SelectValue placeholder="Select archived week" />
            </SelectTrigger>
            <SelectContent>
              {archivedWeeks.map((w) => (
                <SelectItem key={w.weekId} value={w.weekId}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedWeek && (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              {eventTypes.map((event) => {
                const isSvsOff = event.key === "svs" && !selectedWeek.svsActive;
                const attending = isSvsOff
                  ? 0
                  : members.filter((m) => getStatus(selectedWeekId, m.id, event.key) === "check").length;

                return (
                  <Card key={event.key}>
                    <CardHeader className="pb-2">
                      <CardTitle className="font-heading text-gold">{event.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isSvsOff ? (
                        <div className="flex items-center gap-2 py-2">
                          <Minus className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">N/A this week</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-bold text-foreground">{attending}</span>
                            <span className="pb-1 text-sm text-muted-foreground">/ {members.length}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-secondary">
                            <div
                              className="h-2 rounded-full bg-gold transition-all"
                              style={{ width: `${members.length ? (attending / members.length) * 100 : 0}%` }}
                            />
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-gold">
                  Attendance — {selectedWeek.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-gold-muted font-heading">Member</TableHead>
                      <TableHead className="text-gold-muted font-heading">Rank</TableHead>
                      {eventTypes.map((e) => (
                        <TableHead key={e.key} className="text-gold-muted font-heading text-center">
                          {e.name}
                          {e.key === "svs" && !selectedWeek.svsActive && (
                            <span className="ml-1 text-xs text-muted-foreground">(Off)</span>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((m) => (
                      <TableRow key={m.id} className="border-border/50">
                        <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                        <TableCell><RankBadge rank={m.rank} /></TableCell>
                        {eventTypes.map((e) => {
                          const status = getStatus(selectedWeekId, m.id, e.key);
                          const isSvsOff = e.key === "svs" && !selectedWeek.svsActive;
                          return (
                            <TableCell key={e.key} className="text-center">
                              {isSvsOff ? (
                                <Minus className="inline h-4 w-4 text-muted-foreground" />
                              ) : (
                                <StatusIcon status={status} />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
