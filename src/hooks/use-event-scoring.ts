import { useCallback } from "react";
import { useEventTypes } from "@/hooks/use-event-types";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { AVA_METRIC, calculateEventPoints, type EventPointSource } from "@/lib/scoring";

/**
 * Per-week event scoring helpers.
 *
 * - `getEventPointsForWeek(memberId, weekId)` / `getEventMaxForWeek(weekId)`:
 *   parameterized variants — usable for any week (active or archived).
 * - `getEventPoints(memberId)` / `eventMaxThisWeek`: convenience wrappers
 *   bound to the latest active week.
 *
 * If no active week exists, the current-week wrappers return zeros.
 */
export function useEventScoring() {
  const { eventTypes } = useEventTypes();
  const { activeWeeks, isEventActive, getStatus, getValue, hasAnyEntries } = useWeeklyEvents();
  const { metrics } = useScoringConfig();
  const avaMetric = metrics.find((m) => m.key === "avaWeeklyScore") ?? AVA_METRIC;
  const currentWeek = activeWeeks[0] ?? null;

  const getEventPointsForWeek = useCallback(
    (memberId: string, weekId: string) => {
      const sources: EventPointSource[] = eventTypes.map((e) => {
        const toggledOn = isEventActive(weekId, e.key);
        const hasEntries = hasAnyEntries(weekId, e.key, e.inputType);
        return {
          key: e.key,
          inputType: e.inputType,
          pointWeight: e.pointWeight ?? 1,
          isActive: toggledOn && hasEntries,
          status: getStatus(weekId, memberId, e.key),
          value: getValue(weekId, memberId, e.key),
        };
      });
      return calculateEventPoints(sources, avaMetric);
    },
    [eventTypes, isEventActive, getStatus, getValue, hasAnyEntries, avaMetric],
  );

  const getEventMaxForWeek = useCallback(
    (weekId: string) => {
      return eventTypes.reduce((sum, e) => {
        if (!isEventActive(weekId, e.key)) return sum;
        if (!hasAnyEntries(weekId, e.key, e.inputType)) return sum;
        if (e.inputType === "rank") return sum + avaMetric.maxPoints;
        return sum + (e.pointWeight ?? 1);
      }, 0);
    },
    [eventTypes, isEventActive, hasAnyEntries, avaMetric],
  );

  const getEventPoints = useCallback(
    (memberId: string) => {
      if (!currentWeek) return { earned: 0, max: 0 };
      return getEventPointsForWeek(memberId, currentWeek.weekId);
    },
    [currentWeek, getEventPointsForWeek],
  );

  const eventMaxThisWeek = currentWeek ? getEventMaxForWeek(currentWeek.weekId) : 0;

  return {
    getEventPoints,
    getEventPointsForWeek,
    getEventMaxForWeek,
    eventMaxThisWeek,
    hasCurrentWeek: !!currentWeek,
    avaMetric,
    eventTypes,
  };
}
