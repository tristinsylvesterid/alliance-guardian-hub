import { useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { parseAvaScreenshot, type ParsedAvaRow } from "@/lib/ava-import.functions";
import { bestMatch } from "@/lib/fuzzy-match";
import type { Member } from "@/lib/mock-data";

interface Props {
  members: Member[];
  onApply: (assignments: { memberId: string; rank: number }[]) => Promise<void> | void;
  trigger?: React.ReactNode;
}

interface ReviewRow extends ParsedAvaRow {
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

export function AvaImportDialog({ members, onApply, trigger }: Props) {
  const parseFn = useServerFn(parseAvaScreenshot);
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [parsing, setParsing] = useState(false);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [applying, setApplying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (!files.length) return;
    setParsing(true);
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      const result = await parseFn({ data: { images } });
      const reviewRows: ReviewRow[] = result.rows.map((r) => {
        const match = bestMatch(r.name, members, (m) => m.name);
        const auto = !!match && match.exact;
        return {
          ...r,
          matchedMemberId: match && match.score <= 2 ? match.item.id : "skip",
          autoMatched: auto,
        };
      });
      setRows(reviewRows);
      if (!reviewRows.length) {
        toast.error("No rows extracted from screenshots");
      } else {
        toast.success(`Parsed ${reviewRows.length} rows`);
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to parse screenshots");
    } finally {
      setParsing(false);
    }
  }

  async function handleApply() {
    const assignments = rows
      .filter((r) => r.matchedMemberId !== "skip")
      .map((r) => ({ memberId: r.matchedMemberId, rank: r.rank }));
    if (!assignments.length) {
      toast.error("Nothing to apply");
      return;
    }
    setApplying(true);
    try {
      await onApply(assignments);
      toast.success(`Updated AvA rank for ${assignments.length} members`);
      handleClose(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply ranks");
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
            <Sparkles className="mr-2 h-4 w-4" /> Import AvA from screenshot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-heading text-gold">Import AvA ranks from screenshots</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1">
          {rows.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Upload one or more in-game AvA ranking screenshots. The app will read player names and ranks and let you confirm before saving.
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
                  disabled={!files.length || parsing}
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
                  <TableHead className="w-16 text-gold-muted font-heading">Rank</TableHead>
                  <TableHead className="text-gold-muted font-heading">Parsed name</TableHead>
                  <TableHead className="text-gold-muted font-heading">Score</TableHead>
                  <TableHead className="text-gold-muted font-heading">Assign to member</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.rank}-${i}`} className="border-border/50">
                    <TableCell className="font-medium text-foreground">#{r.rank}</TableCell>
                    <TableCell className="text-foreground">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{r.score.toLocaleString()}</TableCell>
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
                  <>Apply {rows.filter((r) => r.matchedMemberId !== "skip").length} ranks</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
