import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useEventTypes } from "@/hooks/use-event-types";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { RankBadge } from "@/components/RankBadge";
import type { Rank } from "@/lib/scoring";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({
    meta: [
      { title: "Settings | nOva Alliance Manager" },
      { name: "description", content: "Manage scoring brackets and event configuration" },
    ],
  }),
});

function SettingsPage() {
  const { eventTypes, addEventType, removeEventType } = useEventTypes();
  const { metrics, maxTotal, updateBracket, addBracket, removeBracket, recalcMaxPoints } = useScoringConfig();
  const { thresholds, updateThreshold } = useRankThresholds();

  const [newEventName, setNewEventName] = useState("");
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [editingThresholds, setEditingThresholds] = useState(false);
  const [localThresholds, setLocalThresholds] = useState<Array<{ rankKey: string; minPercent: number; maxPercent: number | null }>>([]);


  // Local bracket edit state
  const editMetricDef = metrics.find((m) => m.key === editingMetric);
  const [localBrackets, setLocalBrackets] = useState<Array<{ label: string; points: number; min?: number; max?: number; condition?: string }>>([]);

  function openBracketEditor(metricKey: string) {
    const def = metrics.find((m) => m.key === metricKey);
    if (!def) return;
    setLocalBrackets(def.brackets.map((b) => ({ ...b })));
    setEditingMetric(metricKey);
  }

  async function saveBrackets() {
    if (!editingMetric) return;
    // Single atomic update: replace all brackets and recalc max points at once
    const maxPts = Math.max(...localBrackets.map((b) => b.points), 0);
    const { error } = await supabase
      .from("scoring_config")
      .update({ brackets: localBrackets as unknown as Json, max_points: maxPts })
      .eq("key", editingMetric);
    if (error) {
      toast.error(`Failed to save brackets: ${error.message}`);
    } else {
      toast.success("Brackets updated");
    }
    // Refresh metrics from DB
    await recalcMaxPoints(editingMetric);
    setEditingMetric(null);
  }

  function handleAddEvent() {
    if (!newEventName.trim()) return;
    addEventType(newEventName.trim());
    setNewEventName("");
    setAddEventOpen(false);
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage scoring brackets and event configuration</p>
        </div>

        {/* Scoring Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Scoring Brackets</CardTitle>
            <CardDescription>Total possible: {maxTotal} points</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-gold-muted font-heading">Metric</TableHead>
                  <TableHead className="text-gold-muted font-heading text-center">Max Pts</TableHead>
                  <TableHead className="text-gold-muted font-heading">Brackets</TableHead>
                  <TableHead className="text-gold-muted font-heading text-center w-16">Edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
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
                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-gold-muted hover:text-gold"
                        onClick={() => openBracketEditor(metric.key)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Rank Thresholds */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-heading text-gold">Rank Thresholds</CardTitle>
              <CardDescription>Percent of available points needed for each rank (currently {maxTotal} max)</CardDescription>

              <CardDescription>Point ranges that determine each rank class</CardDescription>
            </div>
            {!editingThresholds ? (
              <Button
                variant="ghost"
                className="text-gold-muted hover:text-gold"
                onClick={() => {
                  setLocalThresholds(thresholds.map(t => ({ ...t })));
                  setEditingThresholds(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" /> Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setEditingThresholds(false)}>
                  <X className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button
                  className="bg-gold text-gold-foreground hover:bg-gold/90"
                  onClick={async () => {
                    let failed = false;
                    for (const t of localThresholds) {
                      const result = await updateThreshold(t.rankKey, t.minPercent, t.maxPercent);

                      if (result.error) {
                        toast.error(`Failed to update ${t.rankKey}: ${result.error}`);
                        failed = true;
                      }
                    }
                    if (!failed) {
                      toast.success("Rank thresholds updated");
                    }
                    setEditingThresholds(false);
                  }}
                >
                  <Save className="mr-1 h-4 w-4" /> Save
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {(editingThresholds ? localThresholds : thresholds).map((t, idx) => (
                <div key={t.rankKey} className="flex items-center gap-4 rounded-lg bg-secondary/50 px-4 py-3">
                  <RankBadge rank={t.rankKey as Rank} className="w-12 justify-center" />
                  <div className="flex items-center gap-2 flex-1">
                    {editingThresholds ? (
                      <>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={t.minPercent}
                          onChange={(e) => {
                            const updated = [...localThresholds];
                            updated[idx] = { ...updated[idx], minPercent: parseFloat(e.target.value) || 0 };
                            setLocalThresholds(updated);
                          }}
                          className="w-24"
                          placeholder="Min %"
                        />
                        <span className="text-muted-foreground">–</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          max={100}
                          value={t.maxPercent ?? ""}
                          onChange={(e) => {
                            const updated = [...localThresholds];
                            updated[idx] = { ...updated[idx], maxPercent: e.target.value === "" ? null : parseFloat(e.target.value) || 0 };
                            setLocalThresholds(updated);
                          }}
                          className="w-24"
                          placeholder="∞"
                        />
                        <span className="text-xs text-muted-foreground">% of weekly max</span>
                      </>
                    ) : (
                      <span className="text-sm text-foreground">
                        {t.maxPercent !== null ? `${t.minPercent}% – ${t.maxPercent}%` : `${t.minPercent}%+`}
                      </span>
                    )}

                  </div>
                </div>
              ))}
              <div className="flex items-center gap-4 rounded-lg bg-secondary/30 px-4 py-3">
                <RankBadge rank={"R4" as Rank} className="w-12 justify-center" />
                <span className="text-sm text-muted-foreground">Officer (leadership override)</span>
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-secondary/30 px-4 py-3">
                <RankBadge rank={"R5" as Rank} className="w-12 justify-center" />
                <span className="text-sm text-muted-foreground">Leader (leadership override)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="font-heading text-gold">Tracked Events</CardTitle>
              <CardDescription>Events tracked for attendance</CardDescription>
            </div>
            <Button
              variant="outline"
              className="border-gold/30 text-gold hover:bg-gold/10"
              onClick={() => setAddEventOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Event
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {eventTypes.map((e) => (
                <div key={e.key} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{e.name}</span>
                    <Badge variant="outline" className="text-xs text-gold-muted border-gold-muted">Active</Badge>
                    {e.hasSvsToggle && (
                      <Badge variant="secondary" className="text-xs">SvS Toggle</Badge>
                    )}
                  </div>
                  {!e.hasSvsToggle && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive/60 hover:text-destructive"
                      onClick={() => removeEventType(e.key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading text-gold">Add New Event</DialogTitle>
            <DialogDescription>This event will appear on the Events page for tracking.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Event name (e.g. Canyon Clash)"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddEventOpen(false)}>Cancel</Button>
            <Button onClick={handleAddEvent} disabled={!newEventName.trim()} className="bg-gold text-gold-foreground hover:bg-gold/90">
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Brackets Dialog */}
      <Dialog open={!!editingMetric} onOpenChange={(o) => !o && setEditingMetric(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-gold">
              Edit {editMetricDef?.name} Brackets
            </DialogTitle>
            <DialogDescription>Adjust point values and ranges for each bracket.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {localBrackets.map((b, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg bg-secondary/30 p-3">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={b.label}
                      onChange={(e) => {
                        const updated = [...localBrackets];
                        updated[i] = { ...updated[i], label: e.target.value };
                        setLocalBrackets(updated);
                      }}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Points"
                      value={b.points}
                      onChange={(e) => {
                        const updated = [...localBrackets];
                        updated[i] = { ...updated[i], points: parseInt(e.target.value) || 0 };
                        setLocalBrackets(updated);
                      }}
                      className="w-20"
                    />
                  </div>
                  {editMetricDef?.type !== "boolean" && editMetricDef?.type !== "tier" && (
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={b.min ?? ""}
                        onChange={(e) => {
                          const updated = [...localBrackets];
                          const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          updated[i] = { ...updated[i], min: val };
                          setLocalBrackets(updated);
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={b.max ?? ""}
                        onChange={(e) => {
                          const updated = [...localBrackets];
                          const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                          updated[i] = { ...updated[i], max: val };
                          setLocalBrackets(updated);
                        }}
                        className="flex-1"
                      />
                    </div>
                  )}
                  {(editMetricDef?.type === "boolean" || editMetricDef?.type === "tier") && (
                    <Input
                      placeholder="Condition (e.g. yes, T10)"
                      value={b.condition ?? ""}
                      onChange={(e) => {
                        const updated = [...localBrackets];
                        updated[i] = { ...updated[i], condition: e.target.value || undefined };
                        setLocalBrackets(updated);
                      }}
                    />
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive/60 hover:text-destructive shrink-0"
                  onClick={() => setLocalBrackets(localBrackets.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full border-dashed border-gold/30 text-gold-muted hover:text-gold"
              onClick={() => setLocalBrackets([...localBrackets, { label: "", points: 0 }])}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Bracket
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingMetric(null)}>Cancel</Button>
            <Button onClick={saveBrackets} className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
