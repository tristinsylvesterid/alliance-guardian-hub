import { useState, useCallback, useEffect } from "react";
import {
  METRIC_DEFINITIONS as INITIAL_METRICS,
  MAX_TOTAL_POINTS as computeMax,
  type MetricDefinition,
  type MetricBracket,
} from "@/lib/scoring";

let globalMetrics: MetricDefinition[] = [...INITIAL_METRICS];
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function useScoringConfig() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  function updateMetric(key: string, updates: Partial<MetricDefinition>) {
    globalMetrics = globalMetrics.map((m) =>
      m.key === key ? { ...m, ...updates } : m
    );
    notify();
  }

  function updateBracket(metricKey: string, bracketIndex: number, updates: Partial<MetricBracket>) {
    globalMetrics = globalMetrics.map((m) => {
      if (m.key !== metricKey) return m;
      const newBrackets = m.brackets.map((b, i) =>
        i === bracketIndex ? { ...b, ...updates } : b
      );
      return { ...m, brackets: newBrackets };
    });
    notify();
  }

  function addBracket(metricKey: string, bracket: MetricBracket) {
    globalMetrics = globalMetrics.map((m) => {
      if (m.key !== metricKey) return m;
      return { ...m, brackets: [...m.brackets, bracket] };
    });
    notify();
  }

  function removeBracket(metricKey: string, bracketIndex: number) {
    globalMetrics = globalMetrics.map((m) => {
      if (m.key !== metricKey) return m;
      return { ...m, brackets: m.brackets.filter((_, i) => i !== bracketIndex) };
    });
    notify();
  }

  function recalcMaxPoints(metricKey: string) {
    globalMetrics = globalMetrics.map((m) => {
      if (m.key !== metricKey) return m;
      const max = Math.max(...m.brackets.map((b) => b.points), 0);
      return { ...m, maxPoints: max };
    });
    notify();
  }

  const maxTotal = globalMetrics.reduce((sum, m) => sum + m.maxPoints, 0);

  return {
    metrics: globalMetrics,
    maxTotal,
    updateMetric,
    updateBracket,
    addBracket,
    removeBracket,
    recalcMaxPoints,
  };
}
