import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface ArchiveConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  onConfirm: (reason: string) => void;
}

export function ArchiveConfirmDialog({ open, onOpenChange, memberName, onConfirm }: ArchiveConfirmDialogProps) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason.trim() || "No reason provided");
    setReason("");
  }

  return (
    <AlertDialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setReason(""); }}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-heading text-gold">Archive Member</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            Are you sure you want to archive <span className="font-semibold text-foreground">{memberName}</span>? They will be moved to the archive and removed from the active roster.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2 py-2">
          <Label className="text-muted-foreground">Reason for archiving</Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Inactive, left alliance, etc."
            className="resize-none"
            rows={3}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Archive
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
