import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RankBadge } from "@/components/RankBadge";
import { MemberFormDialog } from "@/components/MemberFormDialog";
import { ArchiveConfirmDialog } from "@/components/ArchiveConfirmDialog";
import { type Member } from "@/lib/mock-data";
import { METRIC_DEFINITIONS, type Rank } from "@/lib/scoring";
import { useArchivedMembers } from "@/hooks/use-archived-members";
import { useMembers } from "@/hooks/use-members";
import { useMemberNameHistory } from "@/hooks/use-member-name-history";
import { useArchivedSnapshot } from "@/hooks/use-archived-snapshot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Search, Plus, Pencil, History } from "lucide-react";

export const Route = createFileRoute("/members")({
  component: MembersPage,
  head: () => ({
    meta: [
      { title: "Members | nOva Alliance Manager" },
      { name: "description", content: "Manage alliance members and their stats" },
    ],
  }),
});

function MembersPage() {
  const [search, setSearch] = useState("");
  const { members, saveMember, deleteMember } = useMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Member | null>(null);
  const { archiveMember } = useArchivedMembers();
  const { getHistoryFor, memberMatchesPreviousName } = useMemberNameHistory();
  const { latestByMember, hasArchive } = useArchivedSnapshot();

  const membersWithScores = members.map((m) => {
    const snap = latestByMember[m.id];
    return {
      ...m,
      score: snap?.totalScore ?? 0,
      rank: ((snap?.rank as Rank | null) ?? "R1") as Rank,
      hasSnap: !!snap,
    };
  });

  const filtered = membersWithScores.filter((m) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return m.name.toLowerCase().includes(q) || memberMatchesPreviousName(m.id, q);
  });

  function formatValue(key: string, val: number | boolean | string) {
    if (typeof val === "boolean") return val ? "Yes" : "No";
    const def = METRIC_DEFINITIONS.find((d) => d.key === key);
    if (def?.unit === "M") return `${val}M`;
    if (def?.unit === "%") return `${val}%`;
    return String(val);
  }

  async function handleSave(saved: Member) {
    await saveMember(saved);
    setEditingMember(null);
  }

  function handleArchiveRequest(member: Member) {
    setArchiveTarget(member);
  }

  async function handleArchiveConfirm(reason: string) {
    if (!archiveTarget) return;
    await archiveMember(archiveTarget, reason);
    await deleteMember(archiveTarget.id);
    setArchiveTarget(null);
  }

  function openAdd() {
    setEditingMember(null);
    setDialogOpen(true);
  }

  function openEdit(member: Member) {
    setEditingMember(member);
    setDialogOpen(true);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Members</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage alliance roster and player stats</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Button onClick={openAdd} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-gold-muted font-heading w-10" />
                    <TableHead className="text-gold-muted font-heading">Name</TableHead>
                    <TableHead className="text-gold-muted font-heading">Rank</TableHead>
                    <TableHead className="text-gold-muted font-heading text-center">Score</TableHead>
                    <TableHead className="text-gold-muted font-heading text-center whitespace-nowrap">Last Updated</TableHead>
                    {METRIC_DEFINITIONS.map((m) => (
                      <TableHead key={m.key} className="text-gold-muted font-heading text-center whitespace-nowrap text-xs">
                        {m.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((member) => (
                    <TableRow key={member.id} className="border-border/50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-gold"
                          onClick={() => openEdit(member)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span>{member.name}</span>
                          {(() => {
                            const hist = getHistoryFor(member.id);
                            if (hist.length === 0) return null;
                            return (
                              <TooltipProvider delayDuration={150}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="inline-flex items-center gap-0.5 rounded border border-gold/30 bg-gold/10 px-1.5 py-0.5 text-[0.65rem] uppercase tracking-wide text-gold cursor-help">
                                      <History className="h-3 w-3" />
                                      aka {hist.length}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-heading text-xs text-gold-muted mb-1">Previously known as</p>
                                    <ul className="space-y-0.5">
                                      {hist.map((h) => (
                                        <li key={h.id} className="text-xs">
                                          <span className="text-foreground">{h.previousName}</span>
                                          <span className="text-muted-foreground"> · {new Date(h.changedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })()}
                        </div>
                      </TableCell>
                      <TableCell><RankBadge rank={member.rank} /></TableCell>
                      <TableCell className="text-center font-bold text-gold">{member.score}</TableCell>
                      <TableCell className="text-center text-sm">
                        {(() => {
                          if (!member.updatedAt) return <span className="text-muted-foreground">—</span>;
                          const d = new Date(member.updatedAt);
                          const daysSince = Math.floor((Date.now() - d.getTime()) / 86400000);
                          const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                          return (
                            <span className={daysSince > 30 ? "text-orange-400" : "text-muted-foreground"}>
                              {formatted}
                            </span>
                          );
                        })()}
                      </TableCell>
                      {METRIC_DEFINITIONS.map((def) => (
                        <TableCell key={def.key} className="text-center text-sm text-muted-foreground">
                          {formatValue(def.key, member.metrics[def.key])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <MemberFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        member={editingMember}
        onSave={handleSave}
        onArchive={handleArchiveRequest}
      />

      <ArchiveConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(v) => { if (!v) setArchiveTarget(null); }}
        memberName={archiveTarget?.name || ""}
        onConfirm={handleArchiveConfirm}
      />
    </AppLayout>
  );
}
