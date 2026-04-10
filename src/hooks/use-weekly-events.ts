import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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
      for (const row of data) {
        if (!cache[row.weekly_event_id]) cache[row.weekly_event_id] = {};
        if (!cache[row.weekly_event_id][row.member_id]) cache[row.weekly_event_id][row.member_id] = {};
        cache[row.weekly_event_id][row.member_id][row.event_type_key] = row.status as EventStatus;
      }
      setAttendanceCache(cache);
    }
  }, []);

  useEffect(() => {
    fetchWeeks();
    fetchAttendance();
  }, [fetchWeeks, fetchAttendance]);

  function getWeekDbId(weekId: string): string | undefined {
    const all = [...activeWeeks, ...archivedWeeks];
    return all.find((w) => w.weekId === weekId)?.id;
  }

  function getStatus(weekId: string, memberId: string, eventKey: string): EventStatus {
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return "x";
    if (eventKey === "svs" && !week.svsActive) return "na";
    return attendanceCache[week.id]?.[memberId]?.[eventKey] ?? "x";
  }

  async function setStatus(weekId: string, memberId: string, eventKey: string, status: EventStatus) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) return;
    await supabase.from("event_attendance").upsert(
      { weekly_event_id: dbId, member_id: memberId, event_type_key: eventKey, status },
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

  async function startNewWeek() {
    const currentNewest = activeWeeks[0];
    let nextStart: Date;
    if (currentNewest) {
      const newestStart = new Date(currentNewest.weekId + "T00:00:00");
      nextStart = new Date(newestStart);
      nextStart.setDate(nextStart.getDate() + 7);
    } else {
      nextStart = getWeekStart(new Date());
    }

    const newWeekId = formatWeekId(nextStart);
    const label = formatWeekLabel(nextStart);

    await supabase.from("weekly_events").insert({
      week_id: newWeekId,
      label,
      svs_active: true,
      is_archived: false,
    });

    // Archive oldest active if too many
    if (activeWeeks.length >= MAX_ACTIVE_WEEKS) {
      const oldest = activeWeeks[activeWeeks.length - 1];
      await supabase.from("weekly_events").update({ is_archived: true }).eq("id", oldest.id);
    }

    await fetchWeeks();
  }

  return {
    activeWeeks,
    archivedWeeks,
    currentWeek: activeWeeks[0] ?? null,
    getStatus,
    setStatus,
    toggleSvs,
    startNewWeek,
  };
}
