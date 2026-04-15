import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface RankThreshold {
  rankKey: string;
  minPoints: number;
  maxPoints: number | null;
}

const DEFAULT_THRESHOLDS: RankThreshold[] = [
  { rankKey: "R1", minPoints: 0, maxPoints: 14 },
  { rankKey: "R2", minPoints: 15, maxPoints: 25 },
  { rankKey: "R3", minPoints: 26, maxPoints: null },
];

export function useRankThresholds() {
  const [thresholds, setThresholds] = useState<RankThreshold[]>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);

  const fetchThresholds = useCallback(async () => {
    const { data } = await supabase
      .from("rank_thresholds")
      .select("*")
      .order("min_points");
    if (data && data.length > 0) {
      setThresholds(
        data.map((r) => ({
          rankKey: r.rank_key,
          minPoints: r.min_points,
          maxPoints: r.max_points,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchThresholds();
  }, [fetchThresholds]);

  async function updateThreshold(rankKey: string, minPoints: number, maxPoints: number | null): Promise<{ error: string | null }> {
    const { error } = await supabase
      .from("rank_thresholds")
      .update({ min_points: minPoints, max_points: maxPoints })
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
