import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface MetricsHistoryEntry {
  id: string;
  memberId: string;
  metrics: Record<string, number | boolean | string>;
  power: number;
  leadershipRank: string | null;
  totalScore: number;
  rank: string | null;
  source: string;
  weekId: string | null;
  recordedAt: string;
  recordedDate: string;
}

function rowToEntry(row: any): MetricsHistoryEntry {
  const rawMetrics: Record<string, Json> =
    row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics)
      ? row.metrics
      : {};
  const metrics: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(rawMetrics)) {
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      metrics[k] = v;
    }
  }
  return {
    id: row.id,
    memberId: row.member_id,
    metrics,
    power: typeof row.power === "number" ? row.power : Number(row.power) || 0,
    leadershipRank: row.leadership_rank ?? null,
    totalScore: row.total_score ?? 0,
    rank: row.rank ?? null,
    source: row.source ?? "edit",
    weekId: row.week_id ?? null,
    recordedAt: row.recorded_at,
    recordedDate: row.recorded_date,
  };
}

export function useMetricsHistory() {
  const [history, setHistory] = useState<MetricsHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("member_metrics_history")
      .select("*")
      .order("recorded_at", { ascending: true });
    if (data) setHistory(data.map(rowToEntry));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHistory();
    const channel = supabase
      .channel("member_metrics_history-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_metrics_history" },
        () => fetchHistory(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchHistory]);

  return { history, loading, refetch: fetchHistory };
}
