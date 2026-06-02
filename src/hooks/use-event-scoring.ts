import { useCallback } from "react";
import { useEventTypes } from "@/hooks/use-event-types";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { calculateEventPoints, type EventPointSource } from "@/lib/scoring";

/**
 * Returns a callable `(memberId) => { earned, max }` that scores a member's
 * current-week event attendance. Events toggled off contribute 0 to both
 * earned and max so the rank percent stays fair. If no current week exists
 * yet, returns { earned: 0, max: 0 } so callers degrade gracefully.
 */
export function useEventScoring() {
  const { eventTypes } = useEventTypes();
  const { activeWeeks, isEventActive, getStatus, getValue } = useWeeklyEvents();
  const currentWeek = activeWeeks[0] ?? null;

  const getEventPoints = useCallback(
    (memberId: string) => {
      if (!currentWeek) return { earned: 0, max: 0 };
      const sources: EventPointSource[] = eventTypes.map((e) => ({
        key: e.key,
        inputType: e.inputType,
        pointWeight: e.pointWeight ?? 1,
        isActive: isEventActive(currentWeek.weekId, e.key),
        status: getStatus(currentWeek.weekId, memberId, e.key),
        value: getValue(currentWeek.weekId, memberId, e.key),
      }));
      return calculateEventPoints(sources);
    },
    [currentWeek, eventTypes, isEventActive, getStatus, getValue],
  );

  /** Max event points available this week, computed once (member-independent). */
  const eventMaxThisWeek = currentWeek
    ? eventTypes.reduce((sum, e) => {
        if (!isEventActive(currentWeek.weekId, e.key)) return sum;
        if (e.inputType === "rank") return sum + 4; // AVA_METRIC.maxPoints
        return sum + (e.pointWeight ?? 1);
      }, 0)
    : 0;

  return { getEventPoints, eventMaxThisWeek, hasCurrentWeek: !!currentWeek };
}
