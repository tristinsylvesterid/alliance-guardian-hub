import { useCallback } from "react";
import { useEventTypes } from "@/hooks/use-event-types";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { AVA_METRIC, calculateEventPoints, type EventPointSource } from "@/lib/scoring";

/**
 * Returns a callable `(memberId) => { earned, max }` that scores a member's
 * current-week event attendance. Events toggled off contribute 0 to both
 * earned and max so the rank percent stays fair. If no current week exists
 * yet, returns { earned: 0, max: 0 } so callers degrade gracefully.
 */
export function useEventScoring() {
  const { eventTypes } = useEventTypes();
  const { activeWeeks, isEventActive, getStatus, getValue, hasAnyEntries } = useWeeklyEvents();
  const { metrics } = useScoringConfig();
  const avaMetric = metrics.find((m) => m.key === "avaWeeklyScore") ?? AVA_METRIC;
  const currentWeek = activeWeeks[0] ?? null;

  const getEventPoints = useCallback(
    (memberId: string) => {
      if (!currentWeek) return { earned: 0, max: 0 };
      const sources: EventPointSource[] = eventTypes.map((e) => {
        const toggledOn = isEventActive(currentWeek.weekId, e.key);
        const hasEntries = hasAnyEntries(currentWeek.weekId, e.key, e.inputType);
        return {
          key: e.key,
          inputType: e.inputType,
          pointWeight: e.pointWeight ?? 1,
          isActive: toggledOn && hasEntries,
          status: getStatus(currentWeek.weekId, memberId, e.key),
          value: getValue(currentWeek.weekId, memberId, e.key),
        };
      });
      const result = calculateEventPoints(sources, avaMetric);
      if (memberId === "aa93b85f-46d1-4c84-bedd-7f62b262ab61") {
        // eslint-disable-next-line no-console
        console.log("[event-scoring khaleesi]", { week: currentWeek.weekId, sources, result, avaMax: avaMetric.maxPoints });
      }
      return result;
    },
    [currentWeek, eventTypes, isEventActive, getStatus, getValue, hasAnyEntries, avaMetric],
  );

  /** Max event points available this week, computed once (member-independent). */
  const eventMaxThisWeek = currentWeek
    ? eventTypes.reduce((sum, e) => {
        if (!isEventActive(currentWeek.weekId, e.key)) return sum;
        if (!hasAnyEntries(currentWeek.weekId, e.key, e.inputType)) return sum;
        if (e.inputType === "rank") return sum + avaMetric.maxPoints;
        return sum + (e.pointWeight ?? 1);
      }, 0)
    : 0;

  return { getEventPoints, eventMaxThisWeek, hasCurrentWeek: !!currentWeek };
}
