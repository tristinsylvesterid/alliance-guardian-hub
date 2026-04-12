import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/changelog")({
  component: ChangeLogPage,
  head: () => ({
    meta: [
      { title: "Change Log — nOva" },
      { name: "description", content: "Audit trail of all data changes" },
    ],
  }),
});

interface AuditEntry {
  id: string;
  created_at: string;
  user_display_name: string;
  table_name: string;
  action: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
}

const TABLE_OPTIONS = [
  "all",
  "members",
  "event_attendance",
  "weekly_events",
  "archived_members",
  "svs_plans",
  "svs_plan_entries",
  "scoring_config",
  "event_types",
];

const PAGE_SIZE = 50;

function ChangeLogPage() {
  const { isAdmin } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (tableFilter !== "all") {
      query = query.eq("table_name", tableFilter);
    }
    if (search.trim()) {
      query = query.ilike("user_display_name", `%${search.trim()}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      setEntries(data as unknown as AuditEntry[]);
      setHasMore(data.length === PAGE_SIZE);
    }
    setLoading(false);
  }, [page, tableFilter, search]);

  useEffect(() => {
    if (isAdmin) fetchEntries();
  }, [isAdmin, fetchEntries]);

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Admin access required.</p>
        </div>
      </AppLayout>
    );
  }

  const actionColor = (action: string) => {
    switch (action) {
      case "INSERT": return "text-emerald-400";
      case "UPDATE": return "text-amber-400";
      case "DELETE": return "text-red-400";
      default: return "text-foreground";
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="font-heading text-2xl font-bold text-gold">Change Log</h1>

        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by user…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={tableFilter} onValueChange={(v) => { setTableFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABLE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>
                  {t === "all" ? "All Tables" : t.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Time</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Record</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                </TableRow>
              ) : entries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No entries found.</TableCell>
                </TableRow>
              ) : (
                entries.map((entry) => {
                  const isExpanded = expandedId === entry.id;
                  return (
                    <>
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <TableCell>
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(entry.created_at), "MMM d, HH:mm:ss")}
                        </TableCell>
                        <TableCell className="font-medium">{entry.user_display_name}</TableCell>
                        <TableCell className="text-xs">{entry.table_name.replace(/_/g, " ")}</TableCell>
                        <TableCell>
                          <span className={`text-xs font-bold ${actionColor(entry.action)}`}>{entry.action}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[120px]">
                          {entry.record_id?.slice(0, 8)}
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${entry.id}-detail`}>
                          <TableCell colSpan={6} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              {entry.old_data && (
                                <div>
                                  <p className="text-muted-foreground mb-1 font-sans font-medium">Before</p>
                                  <pre className="whitespace-pre-wrap break-all bg-background/50 rounded p-2 max-h-60 overflow-auto">
                                    {JSON.stringify(entry.old_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {entry.new_data && (
                                <div>
                                  <p className="text-muted-foreground mb-1 font-sans font-medium">After</p>
                                  <pre className="whitespace-pre-wrap break-all bg-background/50 rounded p-2 max-h-60 overflow-auto">
                                    {JSON.stringify(entry.new_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page + 1}</span>
          <Button variant="outline" size="sm" disabled={!hasMore} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
