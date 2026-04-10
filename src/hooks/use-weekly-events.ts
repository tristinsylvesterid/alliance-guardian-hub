import { useState, useCallback, useEffect } from "react";

export type EventStatus = "check" | "x" | "na";

export interface WeeklyEventData {
  weekId: string; // ISO week start date, e.g. "2026-04-06"
  label: string;
  svsActive: boolean;
  attendance: Record<string, Record<string, EventStatus>>; // memberId -> eventKey -> status
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekId(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatWeekLabel(start: Date): string {
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", opts)}, ${end.getFullYear()}`;
}

function generatePastWeeks(count: number): WeeklyEventData[] {
  const weeks: WeeklyEventData[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    const start = getWeekStart(d);
    const weekId = formatWeekId(start);
    weeks.push({
      weekId,
      label: formatWeekLabel(start),
      svsActive: i === 0 ? true : Math.random() > 0.3,
      attendance: {},
    });
  }
  return weeks;
}

let globalWeeks: WeeklyEventData[] = generatePastWeeks(8);
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function useWeeklyEvents() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  function setWeeks(updater: WeeklyEventData[] | ((prev: WeeklyEventData[]) => WeeklyEventData[])) {
    globalWeeks = typeof updater === "function" ? updater(globalWeeks) : updater;
    notify();
  }

  function getStatus(weekId: string, memberId: string, eventKey: string): EventStatus {
    const week = globalWeeks.find((w) => w.weekId === weekId);
    if (!week) return "x";
    if (eventKey === "svs" && !week.svsActive) return "na";
    return week.attendance[memberId]?.[eventKey] ?? "x";
  }

  function setStatus(weekId: string, memberId: string, eventKey: string, status: EventStatus) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekId !== weekId) return w;
        const memberAtt = { ...w.attendance[memberId], [eventKey]: status };
        return { ...w, attendance: { ...w.attendance, [memberId]: memberAtt } };
      })
    );
  }

  function toggleSvs(weekId: string, active: boolean) {
    setWeeks((prev) =>
      prev.map((w) => {
        if (w.weekId !== weekId) return w;
        return { ...w, svsActive: active };
      })
    );
  }

  return {
    weeks: globalWeeks,
    getStatus,
    setStatus,
    toggleSvs,
  };
}
