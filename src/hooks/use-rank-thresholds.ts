import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RankThreshold {
  rankKey: string;
  minPercent: number;
  maxPercent: number | null;
}

const DEFAULT_THRESHOLDS: RankThreshold[] = [
  { rankKey: "R1", minPercent: 0, maxPercent: 49.99 },
  { rankKey: "R2", minPercent: 50, maxPercent: 84.99 },
  { rankKey: "R3", minPercent: 85, maxPercent: null },
];

export function useRankThresholds() {
  const [thresholds, setThresholds] = useState<RankThreshold[]>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);

  const fetchThresholds = useCallback(async () => {
    const { data } = await supabase
      .from("rank_thresholds")
      .select("*")
      .order("min_percent");
    if (data && data.length > 0) {
      setThresholds(
        data.map((r: any) => ({
          rankKey: r.rank_key,
          minPercent: Number(r.min_percent),
          maxPercent: r.max_percent === null ? null : Number(r.max_percent),
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  async function updateThreshold(rankKey: string, minPercent: number, maxPercent: number | null): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("rank_thresholds")
      .update({ min_percent: minPercent, max_percent: maxPercent } as any)
      .eq("rank_key", rankKey);
    if (error) {
      console.error("Failed to update rank threshold:", error);
      return { error: error.message };
    }
    await fetchThresholds();
    return { error: null };
  }

  return { thresholds, loading, updateThreshold };
}
