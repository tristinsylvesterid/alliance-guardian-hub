import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MetricDefinition, MetricBracket } from "@/lib/scoring";
import type { Json } from "@/integrations/supabase/types";

function rowToMetric(row: {
  key: string;
  name: string;
  type: string;
  unit: string | null;
  max_points: number;
  brackets: Json;
  sort_order: number;
}): MetricDefinition {
  const rawBrackets = Array.isArray(row.brackets) ? row.brackets : [];
  const brackets = rawBrackets.map((b) => {
    const obj = b as Record<string, Json>;
    return {
      label: String(obj.label ?? ""),
      points: Number(obj.points ?? 0),
      min: obj.min != null ? Number(obj.min) : undefined,
      max: obj.max != null ? Number(obj.max) : undefined,
      condition: obj.condition != null ? String(obj.condition) : undefined,
    };
  });

  return {
    key: row.key,
    name: row.name,
    type: row.type as MetricDefinition["type"],
    unit: row.unit ?? undefined,
    maxPoints: row.max_points,
    brackets,
  };
}

export function useScoringConfig() {
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);

  const fetchMetrics = useCallback(async () => {
    const { data } = await supabase.from("scoring_config").select("*").order("sort_order");
    if (data) setMetrics(data.map(rowToMetric));
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  async function updateMetric(key: string, updates: Partial<MetricDefinition>) {
    const dbUpdates: { name?: string; max_points?: number; unit?: string } = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.maxPoints !== undefined) dbUpdates.max_points = updates.maxPoints;
    if (updates.unit !== undefined) dbUpdates.unit = updates.unit;
    await supabase.from("scoring_config").update(dbUpdates).eq("key", key);
    await fetchMetrics();
  }

  async function updateBracket(metricKey: string, bracketIndex: number, updates: Partial<MetricBracket>) {
    const metric = metrics.find((m) => m.key === metricKey);
    if (!metric) return;
    const newBrackets = metric.brackets.map((b, i) =>
      i === bracketIndex ? { ...b, ...updates } : b
    );
    await supabase.from("scoring_config").update({ brackets: newBrackets as unknown as Json }).eq("key", metricKey);
    await fetchMetrics();
  }

  async function addBracket(metricKey: string, bracket: MetricBracket) {
    const metric = metrics.find((m) => m.key === metricKey);
    if (!metric) return;
    const newBrackets = [...metric.brackets, bracket];
    await supabase.from("scoring_config").update({ brackets: newBrackets as unknown as Json }).eq("key", metricKey);
    await fetchMetrics();
  }

  async function removeBracket(metricKey: string, bracketIndex: number) {
    const metric = metrics.find((m) => m.key === metricKey);
    if (!metric) return;
    const newBrackets = metric.brackets.filter((_, i) => i !== bracketIndex);
    await supabase.from("scoring_config").update({ brackets: newBrackets as unknown as Json }).eq("key", metricKey);
    await fetchMetrics();
  }

  async function recalcMaxPoints(metricKey: string) {
    const metric = metrics.find((m) => m.key === metricKey);
    if (!metric) return;
    const max = Math.max(...metric.brackets.map((b) => b.points), 0);
    await supabase.from("scoring_config").update({ max_points: max }).eq("key", metricKey);
    await fetchMetrics();
  }

  const maxTotal = metrics.reduce((sum, m) => sum + m.maxPoints, 0);

  return {
    metrics,
    maxTotal,
    updateMetric,
    updateBracket,
    addBracket,
    removeBracket,
    recalcMaxPoints,
  };
}
