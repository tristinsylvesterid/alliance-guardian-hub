import { useState, useEffect } from "react";
import { Archive } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { METRIC_DEFINITIONS } from "@/lib/scoring";
import type { Member } from "@/lib/mock-data";

const METRIC_HELPERS: Record<string, { step: string; helper: string }> = {
  hqLevel: { step: "1", helper: "Your headquarters level (whole number)" },
  rallyCap: { step: "1", helper: "Max rally capacity level (whole number)" },
  allianceRecognition: { step: "1", helper: "Research completion percentage, 0-100 (no decimals)" },
  avaWeeklyScore: { step: "1", helper: "Your weekly rank position, 1 = best (whole number)" },
  pcHeroes: { step: "0.01", helper: "Number of PC heroes, e.g. 50.5" },
  techPower: { step: "0.01", helper: "In millions, e.g. 14.5" },
  vehiclePower: { step: "0.01", helper: "In millions, e.g. 7.2" },
  killCount: { step: "0.01", helper: "In millions, e.g. 1.5" },
};

interface MemberFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: Member | null;
  onSave: (member: Member) => void;
  onArchive?: (member: Member) => void;
}

function getDefaultMetrics(): Record<string, number | boolean | string> {
  const m: Record<string, number | boolean | string> = {};
  for (const def of METRIC_DEFINITIONS) {
    if (def.type === "boolean") m[def.key] = false;
    else if (def.type === "tier") m[def.key] = "T8";
    else m[def.key] = 0;
  }
  return m;
}

export function MemberFormDialog({ open, onOpenChange, member, onSave, onArchive }: MemberFormDialogProps) {
  const isEdit = !!member;
  const [name, setName] = useState("");
  const [leadershipRank, setLeadershipRank] = useState<"" | "R4" | "R5">("");
  const [metrics, setMetrics] = useState<Record<string, number | boolean | string>>(getDefaultMetrics());
  const [power, setPower] = useState(0);
  const [locationX, setLocationX] = useState(0);
  const [locationY, setLocationY] = useState(0);

  useEffect(() => {
    if (member) {
      setName(member.name);
      setLeadershipRank(member.leadershipRank || "");
      setMetrics({ ...getDefaultMetrics(), ...member.metrics });
      setPower(member.power ?? 0);
      setLocationX(member.locationX ?? 0);
      setLocationY(member.locationY ?? 0);
    } else {
      setName("");
      setLeadershipRank("");
      setMetrics(getDefaultMetrics());
      setPower(0);
      setLocationX(0);
      setLocationY(0);
    }
  }, [member, open]);

  function setMetric(key: string, value: number | boolean | string) {
    setMetrics((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!name.trim()) return;
    const saved: Member = {
      id: member?.id || crypto.randomUUID(),
      name: name.trim(),
      leadershipRank: leadershipRank || undefined,
      metrics,
      power,
      locationX,
      locationY,
      events: member?.events || {},
    };
    onSave(saved);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl text-gold">
            {isEdit ? "Edit Member" : "Add Member"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Name & Leadership */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Player Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter player name"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Leadership Rank</Label>
              <Select value={leadershipRank} onValueChange={(v) => setLeadershipRank(v as "" | "R4" | "R5")}>
                <SelectTrigger>
                  <SelectValue placeholder="None (scored)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (scored)</SelectItem>
                  <SelectItem value="R4">R4 — Officer</SelectItem>
                  <SelectItem value="R5">R5 — Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Metrics */}
          <div className="space-y-1">
            <h3 className="font-heading text-sm text-gold-muted uppercase tracking-wider">Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {METRIC_DEFINITIONS.map((def) => (
                <div key={def.key} className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {def.name} <span className="text-gold-muted">({def.maxPoints} pts max)</span>
                  </Label>

                  {def.type === "boolean" ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!metrics[def.key]}
                        onCheckedChange={(v) => setMetric(def.key, v)}
                      />
                      <span className="text-sm text-foreground">
                        {metrics[def.key] ? "Yes" : "No"}
                      </span>
                    </div>
                  ) : def.type === "tier" ? (
                    <Select
                      value={String(metrics[def.key])}
                      onValueChange={(v) => setMetric(def.key, v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {def.brackets.map((b) => (
                          <SelectItem key={b.condition} value={b.condition!}>
                            {b.label} — {b.points} pts
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      type="number"
                      step={def.unit === "M" ? "0.01" : "1"}
                      value={String(metrics[def.key])}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setMetric(def.key, isNaN(v) ? 0 : v);
                      }}
                      placeholder={def.unit ? `In ${def.unit}` : undefined}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Power */}
          <div className="space-y-1">
            <h3 className="font-heading text-sm text-gold-muted uppercase tracking-wider">Power</h3>
            <div className="pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Power (M)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={power || ""}
                  placeholder="e.g. 150.5"
                  onChange={(e) => setPower(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          {/* Assigned Location */}
          <div className="space-y-1">
            <h3 className="font-heading text-sm text-gold-muted uppercase tracking-wider">Assigned Location</h3>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">X Coordinate</Label>
                <Input
                  type="number"
                  value={locationX || ""}
                  placeholder="X"
                  onChange={(e) => setLocationX(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Y Coordinate</Label>
                <Input
                  type="number"
                  value={locationY || ""}
                  placeholder="Y"
                  onChange={(e) => setLocationY(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {isEdit && onArchive && (
              <Button
                variant="outline"
                className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={() => {
                  onOpenChange(false);
                  onArchive(member!);
                }}
              >
                <Archive className="h-4 w-4" />
                Archive
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim()}>
              {isEdit ? "Save Changes" : "Add Member"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
