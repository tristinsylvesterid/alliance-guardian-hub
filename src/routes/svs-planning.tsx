import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type PollResponse,
} from "@/hooks/use-svs-plans";
import { Swords, Plus } from "lucide-react";

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

function SvsPlanningPage() {
  const { members, setMembers } = useMembers();
  const { plans, createPlan, updateEntry } = useSvsPlans();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Role conflict dialog state
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

  function handleCreatePlan() {
    const plan = createPlan(members);
    setSelectedPlanId(plan.id);
  }

  function handlePowerChange(memberId: string, newPower: number) {
    if (!selectedPlan) return;
    updateEntry(selectedPlan.id, memberId, { power: newPower });
    // Sync back to member profile
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId
          ? { ...m, metrics: { ...m.metrics, techPower: newPower } }
          : m
      )
    );
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
    // If member had an officer role, reset to fighter when changing team
    const role = OFFICER_ROLES.includes(entry.role) ? "fighter" : entry.role;
    updateEntry(selectedPlan.id, memberId, { team: newTeam, role });
  }

  function handleRoleChange(memberId: string, newRole: SvsRole) {
    if (!selectedPlan) return;
    const entry = selectedPlan.entries.find((e) => e.memberId === memberId);
    if (!entry) return;

    // Check for officer conflict
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
    // Demote existing officer to fighter
    updateEntry(conflictDialog.planId, conflictDialog.existingMemberId, {
      role: "fighter",
    });
    // Assign new member the role
    updateEntry(conflictDialog.planId, conflictDialog.memberId, {
      role: conflictDialog.newRole,
    });
    setConflictDialog(null);
  }

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
              <Select
                value={selectedPlan?.id ?? ""}
                onValueChange={setSelectedPlanId}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
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
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{selectedPlan.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Member</TableHead>
                      <TableHead className="w-28">Power (M)</TableHead>
                      <TableHead className="w-32">Poll Response</TableHead>
                      <TableHead className="w-40">Team</TableHead>
                      <TableHead className="w-40">Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPlan.entries.map((entry) => (
                      <TableRow key={entry.memberId}>
                        <TableCell className="font-medium">
                          {entry.name}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={entry.power}
                            onChange={(e) =>
                              handlePowerChange(
                                entry.memberId,
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-24 h-8"
                            step="0.1"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.pollResponse || "none"}
                            onValueChange={(v) =>
                              handlePollChange(
                                entry.memberId,
                                v === "none" ? "" : (v as PollResponse)
                              )
                            }
                          >
                            <SelectTrigger
                              className={`w-28 h-8 ${
                                entry.pollResponse === "yes"
                                  ? "border-green-500 text-green-400"
                                  : entry.pollResponse === "no"
                                    ? "border-red-500 text-red-400"
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
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.team}
                            onValueChange={(v) =>
                              handleTeamChange(entry.memberId, v as SvsTeam)
                            }
                            disabled={entry.pollResponse === "no"}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.entries(TEAM_LABELS) as [SvsTeam, string][]
                              ).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={entry.role}
                            onValueChange={(v) =>
                              handleRoleChange(entry.memberId, v as SvsRole)
                            }
                            disabled={entry.pollResponse === "no"}
                          >
                            <SelectTrigger className="w-36 h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {(
                                Object.entries(ROLE_LABELS) as [SvsRole, string][]
                              ).map(([key, label]) => (
                                <SelectItem key={key} value={key}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role conflict dialog */}
      <AlertDialog
        open={conflictDialog?.open ?? false}
        onOpenChange={(open) => {
          if (!open) setConflictDialog(null);
        }}
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
            <AlertDialogAction onClick={handleConflictConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
