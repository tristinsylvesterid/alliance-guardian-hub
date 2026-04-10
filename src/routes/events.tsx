import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/RankBadge";
import { EVENT_TYPES } from "@/lib/mock-data";
import { useMembers } from "@/hooks/use-members";
import { useWeeklyEvents, type EventStatus } from "@/hooks/use-weekly-events";
import { calculateTotalScore, getRank } from "@/lib/scoring";
import { Check, X, Minus, ChevronDown, Plus } from "lucide-react";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events | nOva Alliance Manager" },
      { name: "description", content: "Track weekly event attendance for alliance members" },
    ],
  }),
});

function StatusIcon({ status }: { status: EventStatus }) {
  if (status === "check") return <Check className="inline h-4 w-4 text-gold" />;
  if (status === "na") return <Minus className="inline h-4 w-4 text-muted-foreground" />;
  return <X className="inline h-4 w-4 text-destructive/60" />;
}

function EventsPage() {
  const { members: rawMembers, setMembers } = useMembers();
  const { activeWeeks, getStatus, setStatus, toggleSvs, startNewWeek } = useWeeklyEvents();
  const [selectedWeekId, setSelectedWeekId] = useState(activeWeeks[0]?.weekId ?? "");

  const selectedWeek = activeWeeks.find((w) => w.weekId === selectedWeekId);
  const isCurrentWeek = selectedWeekId === activeWeeks[0]?.weekId;

  const members = rawMembers.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank);
    return { ...m, score, rank };
  });

  function handleStatusChange(memberId: string, eventKey: string, newStatus: EventStatus) {
    setStatus(selectedWeekId, memberId, eventKey, newStatus);

    if (eventKey === "svs") {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId
            ? { ...m, metrics: { ...m.metrics, svsParticipation: newStatus === "check" } }
            : m
        )
      );
    }
  }

  function handleSvsToggle(active: boolean) {
    toggleSvs(selectedWeekId, active);
  }

  function handleStartNewWeek() {
    startNewWeek();
    // Select the new current week
    setTimeout(() => {
      setSelectedWeekId(activeWeeks[0]?.weekId ?? "");
    }, 0);
  }

  // Sync selectedWeekId if weeks change
  if (!activeWeeks.find((w) => w.weekId === selectedWeekId) && activeWeeks[0]) {
    setSelectedWeekId(activeWeeks[0].weekId);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Events</h1>
            <p className="mt-1 text-sm text-muted-foreground">Track weekly attendance across alliance events</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleStartNewWeek} variant="outline" className="border-gold/30 text-gold hover:bg-gold/10">
              <Plus className="mr-2 h-4 w-4" /> New Week
            </Button>
            <Select value={selectedWeekId} onValueChange={setSelectedWeekId}>
              <SelectTrigger className="w-[260px] border-border bg-card text-foreground">
                <SelectValue placeholder="Select week" />
              </SelectTrigger>
              <SelectContent>
                {activeWeeks.map((w, i) => (
                  <SelectItem key={w.weekId} value={w.weekId}>
                    {i === 0 ? `Current: ${w.label}` : w.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {EVENT_TYPES.map((event) => {
            const isSvsOff = event.key === "svs" && selectedWeek && !selectedWeek.svsActive;
            const attending = isSvsOff
              ? 0
              : members.filter((m) => getStatus(selectedWeekId, m.id, event.key) === "check").length;

            return (
              <Card key={event.key}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-heading text-gold">{event.name}</CardTitle>
                    {event.key === "svs" && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {selectedWeek?.svsActive ? "Active" : "Off"}
                        </span>
                        <Switch
                          checked={selectedWeek?.svsActive ?? false}
                          onCheckedChange={handleSvsToggle}
                          disabled={!isCurrentWeek}
                        />
                      </div>
                    )}
                  </div>
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
                        <span className="pb-1 text-sm text-muted-foreground">/ {members.length} attending</span>
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
              Attendance Roster — {selectedWeek?.label ?? ""}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-gold-muted font-heading">Member</TableHead>
                  <TableHead className="text-gold-muted font-heading">Rank</TableHead>
                  {EVENT_TYPES.map((e) => (
                    <TableHead key={e.key} className="text-gold-muted font-heading text-center">
                      {e.name}
                      {e.key === "svs" && selectedWeek && !selectedWeek.svsActive && (
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
                    {EVENT_TYPES.map((e) => {
                      const status = getStatus(selectedWeekId, m.id, e.key);
                      const isSvsOff = e.key === "svs" && selectedWeek && !selectedWeek.svsActive;
                      const canEdit = isCurrentWeek && !isSvsOff;

                      return (
                        <TableCell key={e.key} className="text-center">
                          {isSvsOff ? (
                            <Minus className="inline h-4 w-4 text-muted-foreground" />
                          ) : canEdit ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center gap-1 rounded px-2 py-1 hover:bg-accent transition-colors focus:outline-none">
                                <StatusIcon status={status} />
                                <ChevronDown className="h-3 w-3 text-muted-foreground" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center">
                                <DropdownMenuItem onClick={() => handleStatusChange(m.id, e.key, "check")}>
                                  <Check className="mr-2 h-4 w-4 text-gold" /> Attended
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStatusChange(m.id, e.key, "x")}>
                                  <X className="mr-2 h-4 w-4 text-destructive/60" /> Absent
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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
      </div>
    </AppLayout>
  );
}
