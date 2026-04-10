import { useState, useCallback, useEffect } from "react";

export type EventStatus = "check" | "x" | "na";

export interface WeeklyEventData {
  weekId: string; // ISO week start date (Monday), e.g. "2026-04-06"
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
  end.setDate(end.getDate() + 6); // Sunday
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

const MAX_ACTIVE_WEEKS = 4;
const initialWeeks = generatePastWeeks(8);

let globalActiveWeeks: WeeklyEventData[] = initialWeeks.slice(0, MAX_ACTIVE_WEEKS);
let globalArchivedWeeks: WeeklyEventData[] = initialWeeks.slice(MAX_ACTIVE_WEEKS);
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

  function getStatus(weekId: string, memberId: string, eventKey: string): EventStatus {
    const allWeeks = [...globalActiveWeeks, ...globalArchivedWeeks];
    const week = allWeeks.find((w) => w.weekId === weekId);
    if (!week) return "x";
    if (eventKey === "svs" && !week.svsActive) return "na";
    return week.attendance[memberId]?.[eventKey] ?? "x";
  }

  function setStatus(weekId: string, memberId: string, eventKey: string, status: EventStatus) {
    globalActiveWeeks = globalActiveWeeks.map((w) => {
      if (w.weekId !== weekId) return w;
      const memberAtt = { ...w.attendance[memberId], [eventKey]: status };
      return { ...w, attendance: { ...w.attendance, [memberId]: memberAtt } };
    });
    notify();
  }

  function toggleSvs(weekId: string, active: boolean) {
    globalActiveWeeks = globalActiveWeeks.map((w) => {
      if (w.weekId !== weekId) return w;
      return { ...w, svsActive: active };
    });
    notify();
  }

  function startNewWeek() {
    // Current newest week becomes index 0; push oldest active to archive
    const currentNewest = globalActiveWeeks[0];
    if (!currentNewest) return;

    const newestStart = new Date(currentNewest.weekId + "T00:00:00");
    const nextStart = new Date(newestStart);
    nextStart.setDate(nextStart.getDate() + 7);

    const newWeek: WeeklyEventData = {
      weekId: formatWeekId(nextStart),
      label: formatWeekLabel(nextStart),
      svsActive: true,
      attendance: {},
    };

    // Move the oldest active week to archive
    if (globalActiveWeeks.length >= MAX_ACTIVE_WEEKS) {
      const oldest = globalActiveWeeks[globalActiveWeeks.length - 1];
      globalArchivedWeeks = [oldest, ...globalArchivedWeeks];
      globalActiveWeeks = [newWeek, ...globalActiveWeeks.slice(0, MAX_ACTIVE_WEEKS - 1)];
    } else {
      globalActiveWeeks = [newWeek, ...globalActiveWeeks];
    }
    notify();
  }

  return {
    activeWeeks: globalActiveWeeks,
    archivedWeeks: globalArchivedWeeks,
    currentWeek: globalActiveWeeks[0] ?? null,
    getStatus,
    setStatus,
    toggleSvs,
    startNewWeek,
  };
}
