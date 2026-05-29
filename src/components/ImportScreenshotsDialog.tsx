import { useState, useRef, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseEventScreenshot } from "@/lib/screenshot-import.functions";
import { bestMatch } from "@/lib/fuzzy-match";
import type { Member } from "@/lib/mock-data";

interface EventTypeOption {
  key: string;
  name: string;
  inputType: string;
}

interface Props {
  members: Member[];
  eventTypes: EventTypeOption[];
  onApplyStatus: (eventKey: string, memberIds: string[]) => Promise<void> | void;
  onApplyRank: (eventKey: string, assignments: { memberId: string; rank: number }[]) => Promise<void> | void;
  trigger?: React.ReactNode;
}

interface ReviewRow {
  name: string;
  rank?: number;
  score?: number;
  matchedMemberId: string | "skip";
  autoMatched: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ImportScreenshotsDialog({ members, eventTypes, onApplyStatus, onApplyRank, trigger }: Props) {
  const parseFn = useServerFn(parseEventScreenshot);
  const [open, setOpen] = useState(false);
  const [eventKey, setEventKey] = useState<string>(eventTypes[0]?.key ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedEvent = useMemo(() => eventTypes.find((e) => e.key === eventKey), [eventTypes, eventKey]);
  const isRank = selectedEvent?.inputType === "rank";

  function reset() {
    setFiles([]);
    setRows([]);
    setParsing(false);
    setApplying(false);
  }

  function handleClose(o: boolean) {
    setOpen(o);
    if (!o) reset();
  }

  async function handleParse() {
    if (!files.length || !selectedEvent) return;
    setParsing(true);
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      const result = await parseFn({
        data: { images, inputType: selectedEvent.inputType === "rank" ? "rank" : "status", eventName: selectedEvent.name },
      });
      const reviewRows: ReviewRow[] = result.rows.map((r: { name: string; rank?: number; score?: number }) => {
        const match = bestMatch(r.name, members, (m) => m.name);
        return {
          name: r.name,
          rank: r.rank,
          score: r.score,
          matchedMemberId: match && match.score <= 2 ? match.item.id : "skip",
          autoMatched: !!match && match.exact,
        };
      });
      setRows(reviewRows);
      if (!reviewRows.length) toast.error("No rows extracted from screenshots");
      else toast.success(`Parsed ${reviewRows.length} ${isRank ? "rows" : "names"}`);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to parse screenshots");
    } finally {
      setParsing(false);
    }
  }

  async function handleApply() {
    if (!selectedEvent) return;
    const matched = rows.filter((r) => r.matchedMemberId !== "skip");
    if (!matched.length) {
      toast.error("Nothing to apply");
      return;
    }
    setApplying(true);
    try {
      if (isRank) {
        const assignments = matched
          .filter((r) => typeof r.rank === "number")
          .map((r) => ({ memberId: r.matchedMemberId, rank: r.rank as number }));
        await onApplyRank(selectedEvent.key, assignments);
        toast.success(`Updated ${selectedEvent.name} rank for ${assignments.length} members`);
      } else {
        const ids = matched.map((r) => r.matchedMemberId);
        await onApplyStatus(selectedEvent.key, ids);
        toast.success(`Marked ${ids.length} members as attended for ${selectedEvent.name}`);
      }
      handleClose(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply changes");
    } finally {
      setApplying(false);
    }
  }

  function updateMatch(idx: number, memberId: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, matchedMemberId: memberId, autoMatched: false } : r)));
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="border-gold/30 text-gold hover:bg-gold/10">
            <Sparkles className="mr-2 h-4 w-4" /> Import from screenshots
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-gold">Import from screenshots</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {rows.length === 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wide text-muted-foreground">Event</label>
                <Select value={eventKey} onValueChange={setEventKey}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pick event…" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((e) => (
                      <SelectItem key={e.key} value={e.key}>
                        {e.name} <span className="text-muted-foreground">({e.inputType === "rank" ? "rank" : "attendance"})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                {isRank
                  ? "Upload AvA ranking screenshots. The app reads names + ranks and lets you confirm before saving."
                  : `Upload screenshots showing who participated in ${selectedEvent?.name ?? "the event"} (rally lists, leaderboards, etc.). Matched members will be marked as attended.`}
              </p>

              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                className="border-gold/30 text-gold hover:bg-gold/10"
              >
                <Upload className="mr-2 h-4 w-4" /> Choose images
              </Button>
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {files.map((f, i) => (
                    <span key={i} className="text-xs rounded bg-secondary px-2 py-1 text-foreground">
                      {f.name}
                    </span>
                  ))}
                </div>
              )}
              <div>
                <Button
                  onClick={handleParse}
                  disabled={!files.length || !eventKey || parsing}
                  className="bg-gold text-background hover:bg-gold/90"
                >
                  {parsing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Parsing…</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Parse {files.length || ""} {files.length === 1 ? "image" : "images"}</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  {isRank && <TableHead className="w-16 text-gold-muted font-heading">Rank</TableHead>}
                  <TableHead className="text-gold-muted font-heading">Parsed name</TableHead>
                  {isRank && <TableHead className="text-gold-muted font-heading">Score</TableHead>}
                  <TableHead className="text-gold-muted font-heading">Assign to member</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.name}-${i}`} className="border-border/50">
                    {isRank && <TableCell className="font-medium text-foreground">#{r.rank}</TableCell>}
                    <TableCell className="text-foreground">{r.name}</TableCell>
                    {isRank && (
                      <TableCell className="text-muted-foreground tabular-nums">
                        {(r.score ?? 0).toLocaleString()}
                      </TableCell>
                    )}
                    <TableCell>
                      <Select value={r.matchedMemberId} onValueChange={(v) => updateMatch(i, v)}>
                        <SelectTrigger className={r.autoMatched ? "border-gold/40" : ""}>
                          <SelectValue placeholder="Pick member…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip this row</SelectItem>
                          {members.map((m) => (
                            <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => removeRow(i)}
                        className="text-muted-foreground hover:text-destructive"
                        title="Remove row"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <DialogFooter>
          {rows.length > 0 && (
            <>
              <Button variant="ghost" onClick={() => setRows([])}>Start over</Button>
              <Button
                onClick={handleApply}
                disabled={applying}
                className="bg-gold text-background hover:bg-gold/90"
              >
                {applying ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Applying…</>
                ) : (
                  <>Apply {rows.filter((r) => r.matchedMemberId !== "skip").length}</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
