import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RankBadge } from "@/components/RankBadge";
import { MOCK_MEMBERS, type Member } from "@/lib/mock-data";
import { calculateTotalScore, getRank, METRIC_DEFINITIONS } from "@/lib/scoring";
import { Search } from "lucide-react";

export const Route = createFileRoute("/members")({
  component: MembersPage,
  head: () => ({
    meta: [
      { title: "Members | Last Z Alliance Manager" },
      { name: "description", content: "Manage alliance members and their stats" },
    ],
  }),
});

function MembersPage() {
  const [search, setSearch] = useState("");

  const membersWithScores = MOCK_MEMBERS.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank);
    return { ...m, score, rank };
  });

  const filtered = membersWithScores.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  function formatValue(key: string, val: number | boolean | string) {
    if (typeof val === "boolean") return val ? "Yes" : "No";
    const def = METRIC_DEFINITIONS.find((d) => d.key === key);
    if (def?.unit === "M") return `${val}M`;
    if (def?.unit === "%") return `${val}%`;
    return String(val);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Members</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage alliance roster and player stats</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-gold-muted font-heading">Name</TableHead>
                    <TableHead className="text-gold-muted font-heading">Rank</TableHead>
                    <TableHead className="text-gold-muted font-heading text-center">Score</TableHead>
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
                      <TableCell className="font-medium text-foreground">{member.name}</TableCell>
                      <TableCell><RankBadge rank={member.rank} /></TableCell>
                      <TableCell className="text-center font-bold text-gold">{member.score}</TableCell>
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
    </AppLayout>
  );
}
