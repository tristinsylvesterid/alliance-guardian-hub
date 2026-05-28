import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RankBadge } from "@/components/RankBadge";
import { useEventTypes } from "@/hooks/use-event-types";
import { useMembers } from "@/hooks/use-members";
import { useWeeklyEvents, type EventStatus } from "@/hooks/use-weekly-events";
import { useWeeklyPolls } from "@/hooks/use-weekly-polls";
import { calculateTotalScore, getRank, METRIC_DEFINITIONS, calculateMetricPoints } from "@/lib/scoring";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { Check, X, Minus, ChevronDown, Plus, Trash2 } from "lucide-react";

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

// Map event type keys to metric keys for auto-updating member profiles
const EVENT_TO_METRIC: Record<string, string> = {
  svs: "svsParticipation",
  ava: "avaWeeklyScore",
};

function EventsPage() {
  const { members: rawMembers, updateMemberMetrics } = useMembers();
  const { eventTypes: rawEventTypes } = useEventTypes();
  const EVENT_ORDER = ["ice_pit_1", "glory_war", "ice_pit_2", "ice_pit_3", "svs", "ava"];
  const eventTypes = [...rawEventTypes].sort((a, b) => {
    const ai = EVENT_ORDER.indexOf(a.key);
    const bi = EVENT_ORDER.indexOf(b.key);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });
  const { activeWeeks, getStatus, getValue, setStatus, toggleSvs, isEventActive, setEventActive, startNewWeek, deleteWeek, currentWeekExists } = useWeeklyEvents();
  const { getPollsForWeek, addPoll, removePoll, getResponse, setResponse } = useWeeklyPolls();
  const { thresholds } = useRankThresholds();
  const [newPollName, setNewPollName] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState(activeWeeks[0]?.weekId ?? "");


  const selectedWeek = activeWeeks.find((w) => w.weekId === selectedWeekId);
  const isCurrentWeek = selectedWeekId === activeWeeks[0]?.weekId;

  const members = rawMembers.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank, thresholds);
    return { ...m, score, rank };
  });

  async function handleStatusChange(memberId: string, eventKey: string, newStatus: EventStatus) {
    await setStatus(selectedWeekId, memberId, eventKey, newStatus);

    if (eventKey === "svs") {
      const member = rawMembers.find((m) => m.id === memberId);
      if (member) {
        await updateMemberMetrics(memberId, {
          ...member.metrics,
          svsParticipation: newStatus === "check",
        });
      }
    }
  }

  async function handleRankChange(memberId: string, eventKey: string, rankValue: number | null) {
    const status: EventStatus = rankValue !== null && rankValue > 0 ? "check" : "x";
    await setStatus(selectedWeekId, memberId, eventKey, status, rankValue);

    // Auto-update member metric
    const metricKey = EVENT_TO_METRIC[eventKey];
    if (metricKey) {
      const member = rawMembers.find((m) => m.id === memberId);
      if (member) {
        await updateMemberMetrics(memberId, {
          ...member.metrics,
          [metricKey]: rankValue ?? 0,
        });
      }
    }
  }

  function handleSvsToggle(active: boolean) {
    toggleSvs(selectedWeekId, active);
  }

  function handleStartNewWeek() {
    startNewWeek();
  }

  if (!activeWeeks.find((w) => w.weekId === selectedWeekId) && activeWeeks[0]) {
    setSelectedWeekId(activeWeeks[0].weekId);
  }

  // Get AvA metric definition for displaying points
  const avaMetric = METRIC_DEFINITIONS.find((m) => m.key === "avaWeeklyScore");

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Events</h1>
            <p className="mt-1 text-sm text-muted-foreground">Record who actually showed up to each weekly event</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleStartNewWeek}
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
              disabled={currentWeekExists}
              title={currentWeekExists ? "This week already exists" : "Create event week for the current calendar week"}
            >
              <Plus className="mr-2 h-4 w-4" /> New Week
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" disabled={!selectedWeekId}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Week
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this week?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete <strong>{selectedWeek?.label}</strong> and all its attendance data. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      deleteWeek(selectedWeekId);
                      setSelectedWeekId(activeWeeks.find(w => w.weekId !== selectedWeekId)?.weekId ?? "");
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {eventTypes.map((event) => {
            const showToggle = event.hasSvsToggle || event.isOptional;
            const isActive = isEventActive(selectedWeekId, event.key);
            const isOff = showToggle && !isActive;

            if (event.inputType === "rank") {
              const rankedMembers = members.filter((m) => {
                const val = getValue(selectedWeekId, m.id, event.key);
                return val !== null && val > 0;
              });
              const avgRank = rankedMembers.length > 0
                ? Math.round(rankedMembers.reduce((sum, m) => sum + (getValue(selectedWeekId, m.id, event.key) ?? 0), 0) / rankedMembers.length)
                : 0;

              return (
                <div
                  key={event.key}
                  className={`rounded-md border border-border bg-card px-3 py-2 ${isOff ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-heading text-xs text-gold">{event.name}</span>
                    {showToggle && (
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => setEventActive(selectedWeekId, event.key, v)}
                        disabled={!isCurrentWeek}
                        className="scale-75"
                      />
                    )}
                  </div>
                  {isOff ? (
                    <div className="mt-0.5 text-sm text-muted-foreground">N/A</div>
                  ) : (
                    <div className="mt-0.5 flex items-baseline gap-2">
                      <span className="text-base font-semibold text-foreground">
                        {rankedMembers.length}<span className="text-muted-foreground"> / {members.length}</span>
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">ranked</span>
                      {avgRank > 0 && (
                        <span className="text-[10px] text-muted-foreground">avg #{avgRank}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const attending = isOff
              ? 0
              : members.filter((m) => getStatus(selectedWeekId, m.id, event.key) === "check").length;

            return (
              <div
                key={event.key}
                className={`rounded-md border border-border bg-card px-3 py-2 ${isOff ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-heading text-xs text-gold">{event.name}</span>
                  {showToggle && (
                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => setEventActive(selectedWeekId, event.key, v)}
                      disabled={!isCurrentWeek}
                      className="scale-75"
                    />
                  )}
                </div>
                {isOff ? (
                  <div className="mt-0.5 text-sm text-muted-foreground">N/A</div>
                ) : (
                  <div className="mt-0.5 text-base font-semibold text-foreground">
                    {attending}<span className="text-muted-foreground"> / {members.length}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>


        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="font-heading text-gold">
                Attendance Roster — {selectedWeek?.label ?? ""}
              </CardTitle>
              {selectedWeek && (
                <div className="flex items-center gap-2">
                  <span className="hidden text-xs uppercase tracking-wide text-muted-foreground sm:inline">
                    Polls (1pt)
                  </span>
                  <Input
                    placeholder="New poll name"
                    value={newPollName}
                    onChange={(e) => setNewPollName(e.target.value)}
                    className="w-56 h-9"
                    disabled={!isCurrentWeek}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-gold/30 text-gold hover:bg-gold/10"
                    disabled={!isCurrentWeek || !newPollName.trim()}
                    onClick={async () => {
                      await addPoll(selectedWeek.id, newPollName.trim());
                      setNewPollName("");
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Poll
                  </Button>
                </div>
              )}
            </div>
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
                      {e.inputType === "rank" && <span className="ml-1 text-xs text-muted-foreground">(#)</span>}
                      {(e.hasSvsToggle || e.isOptional) && !isEventActive(selectedWeekId, e.key) && (
                        <span className="ml-1 text-xs text-muted-foreground">(Off)</span>
                      )}
                    </TableHead>
                  ))}
                  {selectedWeek && getPollsForWeek(selectedWeek.id).map((p, idx) => {
                    const count = members.filter((m) => getResponse(p.id, m.id)).length;
                    return (
                      <TableHead
                        key={p.id}
                        className={`text-gold-muted font-heading text-center ${idx === 0 ? "border-l border-border/60" : ""}`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <span>{p.name}</span>
                          <span className="text-xs text-muted-foreground">({count}/{members.length})</span>
                          {isCurrentWeek && (
                            <button
                              type="button"
                              onClick={() => removePoll(p.id)}
                              className="ml-1 text-muted-foreground hover:text-destructive"
                              title="Delete poll"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                    <TableCell><RankBadge rank={m.rank} /></TableCell>
                    {eventTypes.map((e) => {
                      const isSvsOff = (e.hasSvsToggle || e.isOptional) && !isEventActive(selectedWeekId, e.key);



                      // Rank input type (e.g., AvA)
                      if (e.inputType === "rank") {
                        const rankVal = getValue(selectedWeekId, m.id, e.key);
                        const points = avaMetric && rankVal ? calculateMetricPoints(avaMetric, rankVal) : 0;
                        const canEdit = isCurrentWeek;

                        return (
                          <TableCell key={e.key} className="text-center">
                            {canEdit ? (
                              <div className="flex items-center justify-center gap-1">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="—"
                                  value={rankVal ?? ""}
                                  onChange={(ev) => {
                                    const v = ev.target.value === "" ? null : parseInt(ev.target.value);
                                    handleRankChange(m.id, e.key, v);
                                  }}
                                  className="w-16 h-8 text-center text-sm px-1"
                                />
                                {rankVal !== null && rankVal > 0 && (
                                  <span className="text-xs font-medium text-gold">{points}pt</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1">
                                <span className="text-sm text-foreground">
                                  {rankVal ? `#${rankVal}` : "—"}
                                </span>
                                {rankVal !== null && rankVal > 0 && (
                                  <span className="text-xs font-medium text-gold">{points}pt</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      }

                      // Standard status type
                      const status = getStatus(selectedWeekId, m.id, e.key);
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
                    {selectedWeek && getPollsForWeek(selectedWeek.id).map((p, idx) => {
                      const responded = getResponse(p.id, m.id);
                      return (
                        <TableCell
                          key={p.id}
                          className={`text-center ${idx === 0 ? "border-l border-border/60" : ""}`}
                        >
                          {isCurrentWeek ? (
                            <button
                              type="button"
                              onClick={() => setResponse(p.id, m.id, !responded)}
                              className="inline-flex items-center rounded px-2 py-1 hover:bg-accent transition-colors"
                            >
                              {responded ? (
                                <Check className="h-4 w-4 text-gold" />
                              ) : (
                                <X className="h-4 w-4 text-destructive/60" />
                              )}
                            </button>
                          ) : responded ? (
                            <Check className="inline h-4 w-4 text-gold" />
                          ) : (
                            <X className="inline h-4 w-4 text-destructive/60" />
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
