import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { snapshotAllMembers } from "@/lib/metrics-history";
import type { Member } from "@/lib/mock-data";

export type EventStatus = "check" | "x" | "na";

export interface WeeklyEventData {
  id: string;
  weekId: string;
  label: string;
  svsActive: boolean;
  isArchived: boolean;
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
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

const MAX_ACTIVE_WEEKS = 4;
export function useWeeklyEvents() {
  const [activeWeeks, setActiveWeeks] = useState<WeeklyEventData[]>([]);
  const [archivedWeeks, setArchivedWeeks] = useState<WeeklyEventData[]>([]);
  const [attendanceCache, setAttendanceCache] = useState<Record<string, Record<string, Record<string, EventStatus>>>>({});
  const [valueCache, setValueCache] = useState<Record<string, Record<string, Record<string, number | null>>>>({});
  // toggleCache[weeklyEventId][eventTypeKey] = boolean (default true if absent)
  const [toggleCache, setToggleCache] = useState<Record<string, Record<string, boolean>>>({});

  const fetchWeeks = useCallback(async () => {
    const { data: active } = await supabase

      .from("weekly_events")
      .select("*")
      .eq("is_archived", false)
      .order("week_id", { ascending: false });
    if (active) {
      setActiveWeeks(active.map((r) => ({
        id: r.id,
        weekId: r.week_id,
        label: r.label,
        svsActive: r.svs_active,
        isArchived: r.is_archived,
      })));
    }

    const { data: archived } = await supabase
      .from("weekly_events")
      .select("*")
      .eq("is_archived", true)
      .order("week_id", { ascending: false });
    if (archived) {
      setArchivedWeeks(archived.map((r) => ({
        id: r.id,
        weekId: r.week_id,
        label: r.label,
        svsActive: r.svs_active,
        isArchived: r.is_archived,
      })));
    }
  }, []);

  const fetchAttendance = useCallback(async () => {
    const { data } = await supabase.from("event_attendance").select("*");
    if (data) {
      const cache: Record<string, Record<string, Record<string, EventStatus>>> = {};
      const valCache: Record<string, Record<string, Record<string, number | null>>> = {};
      for (const row of data) {
        if (!cache[row.weekly_event_id]) cache[row.weekly_event_id] = {};
        if (!cache[row.weekly_event_id][row.member_id]) cache[row.weekly_event_id][row.member_id] = {};
        cache[row.weekly_event_id][row.member_id][row.event_type_key] = row.status as EventStatus;
        if (!valCache[row.weekly_event_id]) valCache[row.weekly_event_id] = {};
        if (!valCache[row.weekly_event_id][row.member_id]) valCache[row.weekly_event_id][row.member_id] = {};
        valCache[row.weekly_event_id][row.member_id][row.event_type_key] = (row as any).value ?? null;
      }
      setAttendanceCache(cache);
      setValueCache(valCache);
    }
  }, []);

  const fetchToggles = useCallback(async () => {
    const { data } = await supabase.from("weekly_event_toggles").select("*");
    if (data) {
      const cache: Record<string, Record<string, boolean>> = {};
      for (const row of data as any[]) {
        if (!cache[row.weekly_event_id]) cache[row.weekly_event_id] = {};
        cache[row.weekly_event_id][row.event_type_key] = row.is_active;
      }
      setToggleCache(cache);
    }
  }, []);

  useEffect(() => {
    fetchWeeks();
    fetchAttendance();
    fetchToggles();
  }, [fetchWeeks, fetchAttendance, fetchToggles]);


  function getWeekDbId(weekId: string): string | undefined {
    const all = [...activeWeeks, ...archivedWeeks];
    return all.find((w) => w.weekId === weekId)?.id;
  }

  function isEventActive(weekId: string, eventKey: string): boolean {
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return true;
    // Legacy: SVS uses its own column
    if (eventKey === "svs") return week.svsActive;
    // Generic: default true if no row exists
    return toggleCache[week.id]?.[eventKey] ?? true;
  }

  function getStatus(weekId: string, memberId: string, eventKey: string): EventStatus {
    if (!isEventActive(weekId, eventKey)) return "na";
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return "x";
    return attendanceCache[week.id]?.[memberId]?.[eventKey] ?? "x";
  }


  function getValue(weekId: string, memberId: string, eventKey: string): number | null {
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return null;
    return valueCache[week.id]?.[memberId]?.[eventKey] ?? null;
  }

  /**
   * Returns true if any member has a recorded entry for the given event in the
   * given week. Used to skip not-yet-occurred events from the weekly total so
   * the rank percent isn't deflated mid-week.
   * - status events: any actual row in event_attendance counts (regardless of value)
   * - rank events (AvA): only counts if at least one member has a value > 0
   */
  function hasAnyEntries(weekId: string, eventKey: string, inputType: "status" | "rank"): boolean {
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return false;
    if (inputType === "rank") {
      const memberVals = valueCache[week.id];
      if (!memberVals) return false;
      for (const memberId of Object.keys(memberVals)) {
        const v = memberVals[memberId]?.[eventKey];
        if (v != null && v > 0) return true;
      }
      return false;
    }
    const memberStatuses = attendanceCache[week.id];
    if (!memberStatuses) return false;
    for (const memberId of Object.keys(memberStatuses)) {
      if (memberStatuses[memberId]?.[eventKey] !== undefined) return true;
    }
    return false;
  }

  async function setStatus(weekId: string, memberId: string, eventKey: string, status: EventStatus, value?: number | null) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) return;
    const row: any = { weekly_event_id: dbId, member_id: memberId, event_type_key: eventKey, status };
    if (value !== undefined) row.value = value;
    await supabase.from("event_attendance").upsert(
      row,
      { onConflict: "weekly_event_id,member_id,event_type_key" }
    );
    await fetchAttendance();
  }

  async function toggleSvs(weekId: string, active: boolean) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) return;
    await supabase.from("weekly_events").update({ svs_active: active }).eq("id", dbId);
    await fetchWeeks();
  }

  async function setEventActive(weekId: string, eventKey: string, active: boolean) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) return;
    if (eventKey === "svs") {
      await supabase.from("weekly_events").update({ svs_active: active }).eq("id", dbId);
      await fetchWeeks();
      return;
    }
    await supabase
      .from("weekly_event_toggles")
      .upsert(
        { weekly_event_id: dbId, event_type_key: eventKey, is_active: active } as any,
        { onConflict: "weekly_event_id,event_type_key" }
      );
    await fetchToggles();
  }

  async function deleteWeek(weekId: string) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) return;
    await supabase.from("event_attendance").delete().eq("weekly_event_id", dbId);
    await supabase.from("weekly_event_toggles").delete().eq("weekly_event_id", dbId);
    await supabase.from("weekly_events").delete().eq("id", dbId);
    await fetchWeeks();
    await fetchAttendance();
    await fetchToggles();
  }


  async function startNewWeek(members?: Member[]) {
    const currentStart = getWeekStart(new Date());
    const newWeekId = formatWeekId(currentStart);

    // Check if this week already exists
    const existing = [...activeWeeks, ...archivedWeeks].find(w => w.weekId === newWeekId);
    if (existing) return;

    await supabase.from("weekly_events").insert({
      week_id: newWeekId,
      label: formatWeekLabel(currentStart),
      svs_active: true,
      is_archived: false,
    });

    // Archive oldest active if too many
    if (activeWeeks.length >= MAX_ACTIVE_WEEKS) {
      const oldest = activeWeeks[activeWeeks.length - 1];
      await supabase.from("weekly_events").update({ is_archived: true }).eq("id", oldest.id);
    }

    // Snapshot all members for this new week (auto_weekly).
    if (members && members.length > 0) {
      await snapshotAllMembers(members, "auto_weekly", newWeekId);
    }

    await fetchWeeks();
  }

  const currentCalendarWeekId = formatWeekId(getWeekStart(new Date()));
  const currentWeekExists = [...activeWeeks, ...archivedWeeks].some(w => w.weekId === currentCalendarWeekId);

  return {
    activeWeeks,
    archivedWeeks,
    currentWeek: activeWeeks[0] ?? null,
    currentWeekExists,
    getStatus,
    getValue,
    setStatus,
    toggleSvs,
    isEventActive,
    setEventActive,
    hasAnyEntries,

    startNewWeek,
    deleteWeek,
  };
}
