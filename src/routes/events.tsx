import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RankBadge } from "@/components/RankBadge";
import { MOCK_MEMBERS, EVENT_TYPES } from "@/lib/mock-data";
import { calculateTotalScore, getRank } from "@/lib/scoring";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events | Last Z Alliance Manager" },
      { name: "description", content: "Track event attendance for alliance members" },
    ],
  }),
});

function EventsPage() {
  const members = MOCK_MEMBERS.map((m) => {
    const score = calculateTotalScore(m.metrics);
    const rank = getRank(score, m.leadershipRank);
    return { ...m, score, rank };
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">Track attendance across alliance events</p>
        </div>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          {EVENT_TYPES.map((event) => {
            const attending = members.filter((m) => m.events[event.key]).length;
            return (
              <Card key={event.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="font-heading text-gold">{event.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-foreground">{attending}</span>
                    <span className="pb-1 text-sm text-muted-foreground">/ {members.length} attending</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-gold transition-all"
                      style={{ width: `${(attending / members.length) * 100}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Attendance Roster</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-gold-muted font-heading">Member</TableHead>
                  <TableHead className="text-gold-muted font-heading">Rank</TableHead>
                  {EVENT_TYPES.map((e) => (
                    <TableHead key={e.key} className="text-gold-muted font-heading text-center">{e.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="border-border/50">
                    <TableCell className="font-medium text-foreground">{m.name}</TableCell>
                    <TableCell><RankBadge rank={m.rank} /></TableCell>
                    {EVENT_TYPES.map((e) => (
                      <TableCell key={e.key} className="text-center">
                        {m.events[e.key] ? (
                          <Check className="inline h-4 w-4 text-gold" />
                        ) : (
                          <X className="inline h-4 w-4 text-destructive/60" />
                        )}
                      </TableCell>
                    ))}
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
