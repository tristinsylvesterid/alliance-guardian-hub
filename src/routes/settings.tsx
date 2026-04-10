import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { METRIC_DEFINITIONS, MAX_TOTAL_POINTS } from "@/lib/scoring";
import { EVENT_TYPES } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings | Last Z Alliance Manager" },
      { name: "description", content: "View scoring brackets and event configuration" },
    ],
  }),
});

function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Scoring brackets and configuration (editing in Phase 2)</p>
        </div>

        {/* Scoring Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Scoring Brackets</CardTitle>
            <CardDescription>Total possible: {MAX_TOTAL_POINTS} points · R1 ≤14 · R2 15-25 · R3 26+</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-gold-muted font-heading">Metric</TableHead>
                  <TableHead className="text-gold-muted font-heading text-center">Max Pts</TableHead>
                  <TableHead className="text-gold-muted font-heading">Brackets</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRIC_DEFINITIONS.map((metric) => (
                  <TableRow key={metric.key} className="border-border/50">
                    <TableCell className="font-medium text-foreground">{metric.name}</TableCell>
                    <TableCell className="text-center font-bold text-gold">{metric.maxPoints}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {metric.brackets.map((b, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {b.label}: {b.points}pt{b.points !== 1 ? "s" : ""}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Tracked Events</CardTitle>
            <CardDescription>Events tracked for attendance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {EVENT_TYPES.map((e) => (
                <div key={e.key} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                  <span className="font-medium text-foreground">{e.name}</span>
                  <Badge variant="outline" className="text-xs text-gold-muted border-gold-muted">Active</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
