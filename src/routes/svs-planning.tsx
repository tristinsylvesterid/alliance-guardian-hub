import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { useMembers } from "@/hooks/use-members";
import {
  useSvsPlans,
  TEAM_LABELS,
  ROLE_LABELS,
  type SvsTeam,
  type SvsRole,
  type SvsMode,
  type SvsResult,
  type SvsWeek,
  type PollResponse,
} from "@/hooks/use-svs-plans";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Swords, Plus, ArrowUpDown, ArrowUp, ArrowDown, Shield, Target } from "lucide-react";

type SortKey = "name" | "power" | "pollResponse" | "team" | "role" | "location";
type SortDir = "asc" | "desc";

export const Route = createFileRoute("/svs-planning")({
  component: SvsPlanningPage,
  head: () => ({
    meta: [
      { title: "SvS Planning | nOva Alliance Manager" },
      { name: "description", content: "Plan and organize SvS teams and roles" },
    ],
  }),
});

const OFFICER_ROLES: SvsRole[] = ["deputy", "commander", "intel_officer"];
const ALL_TEAMS: SvsTeam[] = ["team1", "team2", "team3", "team4", "fighting_elsewhere"];

function SvsPlanningPage() {
  const { members, updateMemberLocation } = useMembers();
  const { plans, createPlan, updateEntry, updatePlan } = useSvsPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const [conflictDialog, setConflictDialog] = useState<{
    open: boolean;
    planId: string;
    memberId: string;
    newRole: SvsRole;
    team: SvsTeam;
    existingMemberName: string;
    existingMemberId: string;
  } | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null;

  const TEAM_ORDER: Record<SvsTeam, number> = { team1: 0, team2: 1, team3: 2, team4: 3, fighting_elsewhere: 4 };
  const ROLE_ORDER: Record<SvsRole, number> = { commander: 0, deputy: 1, intel_officer: 2, fighter: 3 };

  const sortedEntries = useMemo(() => {
    if (!selectedPlan) return [];
    const entries = [...selectedPlan.entries];
    entries.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "power": cmp = a.power - b.power; break;
        case "pollResponse": cmp = a.pollResponse.localeCompare(b.pollResponse); break;
        case "team": cmp = TEAM_ORDER[a.team] - TEAM_ORDER[b.team]; break;
        case "role": cmp = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]; break;
        case "location": cmp = a.locationX - b.locationX || a.locationY - b.locationY; break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return entries;
  }, [selectedPlan, sortKey, sortDir]);

  const teamSummary = useMemo(() => {
    if (!selectedPlan) return {};
    const summary: Record<string, { fighters: number; deputies: number; commanders: number; intel: number; total: number }> = {};
    for (const t of ALL_TEAMS) {
      summary[t] = { fighters: 0, deputies: 0, commanders: 0, intel: 0, total: 0 };
    }
    for (const e of selectedPlan.entries) {
      const s = summary[e.team];
      if (!s) continue;
      s.total++;
      if (e.role === "fighter") s.fighters++;
      else if (e.role === "deputy") s.deputies++;
      else if (e.role === "commander") s.commanders++;
      else if (e.role === "intel_officer") s.intel++;
    }
    return summary;
  }, [selectedPlan]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function handleCreatePlan() {
    const planId = await createPlan(members);
    setSelectedPlanId(planId);
  }

  function handlePowerChange(memberId: string, newPower: number) {
    if (!selectedPlan) return;
    updateEntry(selectedPlan.id, memberId, { power: newPower });
  }

  async function handleLocationChange(memberId: string, axis: "locationX" | "locationY", value: number) {
    if (!selectedPlan) return;
    updateEntry(selectedPlan.id, memberId, { [axis]: value });
    // Sync back to member profile
    const entry = selectedPlan.entries.find((e) => e.memberId === memberId);
    if (entry) {
      const newX = axis === "locationX" ? value : entry.locationX;
      const newY = axis === "locationY" ? value : entry.locationY;
      await updateMemberLocation(memberId, newX, newY);
    }
  }

  function handlePollChange(memberId: string, response: PollResponse) {
    if (!selectedPlan) return;
    const updates: { pollResponse: PollResponse; team?: SvsTeam; role?: SvsRole } = {
      pollResponse: response,
    };
    if (response === "no") {
      updates.team = "team4";
      updates.role = "fighter";
    }
    updateEntry(selectedPlan.id, memberId, updates);
  }

  function handleTeamChange(memberId: string, newTeam: SvsTeam) {
    if (!selectedPlan) return;
    const entry = selectedPlan.entries.find((e) => e.memberId === memberId);
    if (!entry) return;
    const role = newTeam === "fighting_elsewhere" ? "fighter" : (OFFICER_ROLES.includes(entry.role) ? "fighter" : entry.role);
    updateEntry(selectedPlan.id, memberId, { team: newTeam, role });
  }

  function handleRoleChange(memberId: string, newRole: SvsRole) {
    if (!selectedPlan) return;
    const entry = selectedPlan.entries.find((e) => e.memberId === memberId);
    if (!entry) return;

    if (OFFICER_ROLES.includes(newRole)) {
      const existing = selectedPlan.entries.find(
        (e) =>
          e.memberId !== memberId &&
          e.team === entry.team &&
          e.role === newRole
      );
      if (existing) {
        setConflictDialog({
          open: true,
          planId: selectedPlan.id,
          memberId,
          newRole,
          team: entry.team,
          existingMemberName: existing.name,
          existingMemberId: existing.memberId,
        });
        return;
      }
    }
    updateEntry(selectedPlan.id, memberId, { role: newRole });
  }

  function handleConflictConfirm() {
    if (!conflictDialog) return;
    updateEntry(conflictDialog.planId, conflictDialog.existingMemberId, { role: "fighter" });
    updateEntry(conflictDialog.planId, conflictDialog.memberId, { role: conflictDialog.newRole });
    setConflictDialog(null);
  }

  const isDefending = selectedPlan?.mode === "defending";

  const SORT_COLUMNS: [SortKey, string, string][] = [
    ["name", "Member", "w-44"],
    ["power", "Power (M)", "w-24"],
    ["pollResponse", "Poll", "w-28"],
    ["team", "Team", "w-36"],
    ["role", "Role", "w-36"],
    ...(isDefending ? [["location", "Location (X / Y)", "w-40"] as [SortKey, string, string]] : []),
  ];

  const hasT10sHeader = true; // always show T10s column

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-gold flex items-center gap-3">
              <Swords className="h-8 w-8" />
              SvS Planning
            </h1>
            <p className="mt-1 text-muted-foreground">
              Organize teams, assign roles, and prepare for battle
            </p>
          </div>
          <div className="flex items-center gap-3">
            {plans.length > 1 && (
              <Select value={selectedPlan?.id ?? ""} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button onClick={handleCreatePlan}>
              <Plus className="h-4 w-4 mr-1" /> New SvS Plan
            </Button>
          </div>
        </div>

        {!selectedPlan ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Swords className="h-12 w-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No SvS plans yet.</p>
              <Button className="mt-4" onClick={handleCreatePlan}>
                <Plus className="h-4 w-4 mr-1" /> Create First Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Mode:</span>
                    <Select
                      value={selectedPlan.mode || "none"}
                      onValueChange={(v) => updatePlan(selectedPlan.id, { mode: v === "none" ? "" : v as SvsMode })}
                    >
                      <SelectTrigger className="w-40 h-8">
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="invading">
                          <span className="inline-flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Invading</span>
                        </SelectItem>
                        <SelectItem value="defending">
                          <span className="inline-flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Defending</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Opponent Server:</span>
                    <Input
                      value={selectedPlan.opponentServer}
                      onChange={(e) => updatePlan(selectedPlan.id, { opponentServer: e.target.value })}
                      placeholder="e.g. S42"
                      className="w-32 h-8"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Week:</span>
                    <Select
                      value={selectedPlan.svsWeek || "none"}
                      onValueChange={(v) => updatePlan(selectedPlan.id, { svsWeek: v === "none" ? "" : v as SvsWeek })}
                    >
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="1">Week 1</SelectItem>
                        <SelectItem value="2">Week 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium">Result:</span>
                    <Select
                      value={selectedPlan.result || "none"}
                      onValueChange={(v) => updatePlan(selectedPlan.id, { result: v === "none" ? "" : v as SvsResult, ...(v === "win" ? { capitalPercentage: 0 } : {}) })}
                    >
                      <SelectTrigger className={`w-28 h-8 ${selectedPlan.result === "win" ? "border-green-500 text-green-400" : selectedPlan.result === "lose" ? "border-red-500 text-red-400" : ""}`}>
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="win"><span className="text-green-400 font-medium">Win</span></SelectItem>
                        <SelectItem value="lose"><span className="text-red-400 font-medium">Lose</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedPlan.result === "lose" && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground font-medium">Capital %:</span>
                      <Input
                        type="number"
                        value={selectedPlan.capitalPercentage || ""}
                        onChange={(e) => updatePlan(selectedPlan.id, { capitalPercentage: parseFloat(e.target.value) || 0 })}
                        placeholder="e.g. 65"
                        className="w-20 h-8"
                        min={0}
                        max={100}
                      />
                    </div>
                  )}
                  {selectedPlan.mode && (
                    <Badge variant="outline" className={selectedPlan.mode === "invading" ? "border-destructive text-destructive" : "border-primary text-primary"}>
                      {selectedPlan.mode === "invading" ? "⚔ Invading" : "🛡 Defending"}
                      {selectedPlan.opponentServer ? ` vs ${selectedPlan.opponentServer}` : ""}
                    </Badge>
                  )}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground font-medium">Notes & Insights</span>
                  <Textarea
                    value={selectedPlan.notes}
                    onChange={(e) => updatePlan(selectedPlan.id, { notes: e.target.value })}
                    placeholder="Add notes, strategies, insights, post-match analysis..."
                    className="mt-1.5 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {ALL_TEAMS.map((t) => {
                const s = teamSummary[t];
                if (!s) return null;
                return (
                  <Card key={t} className="p-4">
                    <h3 className="font-heading text-sm font-semibold text-gold mb-2">{TEAM_LABELS[t]}</h3>
                    <p className="text-2xl font-bold text-foreground">{s.total}</p>
                    {t !== "fighting_elsewhere" && (
                      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        <p>{s.fighters} Fighter{s.fighters !== 1 ? "s" : ""}</p>
                        <p>{s.commanders} Commander{s.commanders !== 1 ? "s" : ""}</p>
                        <p>{s.deputies} Deput{s.deputies !== 1 ? "ies" : "y"}</p>
                        <p>{s.intel} Intel Officer{s.intel !== 1 ? "s" : ""}</p>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{selectedPlan.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-border overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {SORT_COLUMNS.map(([key, label, width]) => (
                          <TableHead
                            key={key}
                            className={`${width} cursor-pointer select-none hover:text-foreground transition-colors`}
                            onClick={() => toggleSort(key)}
                          >
                            <span className="inline-flex items-center gap-1">
                              {label}
                              {sortKey === key ? (
                                sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                              ) : (
                                <ArrowUpDown className="h-3 w-3 opacity-30" />
                              )}
                            </span>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEntries.map((entry) => (
                        <TableRow key={entry.memberId}>
                          <TableCell className="font-medium">{entry.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={entry.power || ""}
                              placeholder="—"
                              onChange={(e) => handlePowerChange(entry.memberId, parseFloat(e.target.value) || 0)}
                              className="w-20 h-8"
                              step="0.1"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.pollResponse || "none"}
                              onValueChange={(v) => handlePollChange(entry.memberId, v === "none" ? "" : v as PollResponse)}
                            >
                              <SelectTrigger
                              className={`w-28 h-8 ${
                                  entry.pollResponse === "yes"
                                    ? "border-green-500 text-green-400"
                                    : entry.pollResponse === "no"
                                      ? "border-red-500 text-red-400"
                                      : entry.pollResponse === "didnt_answer"
                                        ? "border-amber-500 text-amber-400"
                                        : ""
                                }`}
                              >
                                <SelectValue placeholder="—" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">—</SelectItem>
                                <SelectItem value="yes">
                                  <span className="text-green-400 font-medium">Yes</span>
                                </SelectItem>
                                <SelectItem value="no">
                                  <span className="text-red-400 font-medium">No</span>
                                </SelectItem>
                                <SelectItem value="didnt_answer">
                                  <span className="text-amber-400 font-medium">Didn't Answer</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.team}
                              onValueChange={(v) => handleTeamChange(entry.memberId, v as SvsTeam)}
                              disabled={entry.pollResponse === "no"}
                            >
                              <SelectTrigger className="w-32 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.entries(TEAM_LABELS) as [SvsTeam, string][]).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={entry.role}
                              onValueChange={(v) => handleRoleChange(entry.memberId, v as SvsRole)}
                              disabled={entry.pollResponse === "no" || entry.team === "fighting_elsewhere"}
                            >
                              <SelectTrigger className={`w-32 h-8 ${entry.team === "fighting_elsewhere" ? "opacity-40" : ""}`}>
                                <SelectValue>{entry.team === "fighting_elsewhere" ? "—" : ROLE_LABELS[entry.role]}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.entries(ROLE_LABELS) as [SvsRole, string][]).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {isDefending && (
                            <TableCell>
                              {entry.team !== "fighting_elsewhere" ? (
                                <div className="flex items-center gap-1">
                                  <Input
                                    type="number"
                                    value={entry.locationX || ""}
                                    placeholder="X"
                                    onChange={(e) => handleLocationChange(entry.memberId, "locationX", parseInt(e.target.value) || 0)}
                                    className="w-16 h-8"
                                  />
                                  <Input
                                    type="number"
                                    value={entry.locationY || ""}
                                    placeholder="Y"
                                    onChange={(e) => handleLocationChange(entry.memberId, "locationY", parseInt(e.target.value) || 0)}
                                    className="w-16 h-8"
                                  />
                                </div>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Checkbox
                              checked={entry.hasT10s}
                              onCheckedChange={(checked) =>
                                updateEntry(selectedPlan.id, entry.memberId, { hasT10s: !!checked })
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog
        open={conflictDialog?.open ?? false}
        onOpenChange={(open) => { if (!open) setConflictDialog(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Role Already Assigned</AlertDialogTitle>
            <AlertDialogDescription>
              {conflictDialog &&
                `${conflictDialog.existingMemberName} has already been assigned as ${ROLE_LABELS[conflictDialog.newRole]} for ${TEAM_LABELS[conflictDialog.team]}. Are you sure you want to change it? ${conflictDialog.existingMemberName} will be reassigned to Fighter.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConflictConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
