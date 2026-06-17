import { useState, useEffect, useCallback, useContext, createContext, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { snapshotMemberMetrics } from "@/lib/metrics-history";
import type { Member } from "@/lib/mock-data";
import {
  AVA_METRIC,
  calculateEventPoints,
  type EventPointSource,
  type MetricDefinition,
  type RankThresholdEntry,
} from "@/lib/scoring";

export type EventStatus = "check" | "x" | "na";

export interface WeeklyEventData {
  id: string;
  weekId: string;
  label: string;
  svsActive: boolean;
  isArchived: boolean;
}

export interface ArchiveContext {
  members: Member[];
  scoringMetrics: MetricDefinition[];
  thresholds: RankThresholdEntry[];
  baseMaxPoints: number;
  eventTypes: { key: string; inputType: "status" | "rank"; pointWeight: number }[];
  avaMetric?: MetricDefinition;
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

/** End-of-week date string for a YYYY-MM-DD weekId. Used so each archive
 *  snapshot gets its own slot in the (member_id, recorded_date) unique key. */
function weekEndDate(weekId: string): string {
  const d = new Date(weekId);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

const MAX_ACTIVE_WEEKS = 4;

function useWeeklyEventsState() {
  const [activeWeeks, setActiveWeeks] = useState<WeeklyEventData[]>([]);
  const [archivedWeeks, setArchivedWeeks] = useState<WeeklyEventData[]>([]);
  const [attendanceCache, setAttendanceCache] = useState<Record<string, Record<string, Record<string, EventStatus>>>>({});
  const [valueCache, setValueCache] = useState<Record<string, Record<string, Record<string, number | null>>>>({});
  const [toggleCache, setToggleCache] = useState<Record<string, Record<string, boolean>>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean>(false);

  const fetchWeeks = useCallback(async () => {
    const { data: active, error: aErr } = await supabase
      .from("weekly_events")
      .select("*")
      .eq("is_archived", false)
      .order("week_id", { ascending: false });
    if (aErr) {
      console.error("[useWeeklyEvents] fetch active weekly_events failed", aErr);
      setLoadError(aErr.message);
      return;
    }
    if (active) {
      setActiveWeeks(active.map((r) => ({
        id: r.id,
        weekId: r.week_id,
        label: r.label,
        svsActive: r.svs_active,
        isArchived: r.is_archived,
      })));
    }

    const { data: archived, error: arErr } = await supabase
      .from("weekly_events")
      .select("*")
      .eq("is_archived", true)
      .order("week_id", { ascending: false });
    if (arErr) {
      console.error("[useWeeklyEvents] fetch archived weekly_events failed", arErr);
      setLoadError(arErr.message);
      return;
    }
    if (archived) {
      setArchivedWeeks(archived.map((r) => ({
        id: r.id,
        weekId: r.week_id,
        label: r.label,
        svsActive: r.svs_active,
        isArchived: r.is_archived,
      })));
    }
    setLoadError(null);
  }, []);

  const fetchAttendance = useCallback(async () => {
    const { data, error } = await supabase.from("event_attendance").select("*");
    if (error) {
      console.error("[useWeeklyEvents] fetch event_attendance failed", error);
      setLoadError(error.message);
      return;
    }
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
    const { data, error } = await supabase.from("weekly_event_toggles").select("*");
    if (error) {
      console.error("[useWeeklyEvents] fetch weekly_event_toggles failed", error);
      return;
    }
    if (data) {
      const cache: Record<string, Record<string, boolean>> = {};
      for (const row of data as any[]) {
        if (!cache[row.weekly_event_id]) cache[row.weekly_event_id] = {};
        cache[row.weekly_event_id][row.event_type_key] = row.is_active;
      }
      setToggleCache(cache);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchWeeks(), fetchAttendance(), fetchToggles()]);
  }, [fetchWeeks, fetchAttendance, fetchToggles]);

  // Session-aware load: only fetch when a Supabase session exists, and refetch
  // when the user signs in. RLS on these tables is TO authenticated, so a
  // pre-session fetch returns [] and would silently blank the UI.
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        setHasSession(true);
        void refreshAll();
      } else {
        setHasSession(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (session && !hasSession) {
          setHasSession(true);
          void refreshAll();
        } else if (session) {
          // already had session; nothing to do
        }
      } else if (event === "SIGNED_OUT") {
        setHasSession(false);
        setActiveWeeks([]);
        setArchivedWeeks([]);
        setAttendanceCache({});
        setValueCache({});
        setToggleCache({});
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshAll]);


  function getWeekDbId(weekId: string): string | undefined {
    const all = [...activeWeeks, ...archivedWeeks];
    return all.find((w) => w.weekId === weekId)?.id;
  }

  function isEventActive(weekId: string, eventKey: string): boolean {
    const all = [...activeWeeks, ...archivedWeeks];
    const week = all.find((w) => w.weekId === weekId);
    if (!week) return true;
    if (eventKey === "svs") return week.svsActive;
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

  function applyAttendanceOptimistic(
    weeklyEventDbId: string,
    entries: Array<{ memberId: string; eventKey: string; status: EventStatus; value?: number | null }>,
  ) {
    setAttendanceCache((prev) => {
      const next = { ...prev };
      const wk = { ...(next[weeklyEventDbId] ?? {}) };
      for (const e of entries) {
        wk[e.memberId] = { ...(wk[e.memberId] ?? {}), [e.eventKey]: e.status };
      }
      next[weeklyEventDbId] = wk;
      return next;
    });
    setValueCache((prev) => {
      const next = { ...prev };
      const wk = { ...(next[weeklyEventDbId] ?? {}) };
      for (const e of entries) {
        if (e.value !== undefined) {
          wk[e.memberId] = { ...(wk[e.memberId] ?? {}), [e.eventKey]: e.value };
        }
      }
      next[weeklyEventDbId] = wk;
      return next;
    });
  }

  async function setStatus(weekId: string, memberId: string, eventKey: string, status: EventStatus, value?: number | null) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) throw new Error("No active week selected — pick a week before saving attendance.");
    const row: any = { weekly_event_id: dbId, member_id: memberId, event_type_key: eventKey, status };
    if (value !== undefined) row.value = value;
    const { error } = await supabase.from("event_attendance").upsert(
      row,
      { onConflict: "weekly_event_id,member_id,event_type_key" }
    );
    if (error) {
      console.error("[setStatus] upsert failed", error, row);
      throw new Error(error.message);
    }
    applyAttendanceOptimistic(dbId, [{ memberId, eventKey, status, value }]);
    await fetchAttendance();
  }

  async function setStatusBulk(
    weekId: string,
    entries: Array<{ memberId: string; eventKey: string; status: EventStatus; value?: number | null }>,
  ) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) throw new Error("No active week selected — pick a week before saving attendance.");
    if (entries.length === 0) return;
    const rows = entries.map((e) => {
      const row: any = {
        weekly_event_id: dbId,
        member_id: e.memberId,
        event_type_key: e.eventKey,
        status: e.status,
      };
      if (e.value !== undefined) row.value = e.value;
      return row;
    });
    const { error } = await supabase.from("event_attendance").upsert(
      rows,
      { onConflict: "weekly_event_id,member_id,event_type_key" },
    );
    if (error) {
      console.error("[setStatusBulk] upsert failed", error, { count: rows.length, first: rows[0] });
      throw new Error(error.message);
    }
    applyAttendanceOptimistic(dbId, entries);
    await fetchAttendance();
  }

  async function toggleSvs(weekId: string, active: boolean) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) throw new Error("No active week selected.");
    const { error } = await supabase.from("weekly_events").update({ svs_active: active }).eq("id", dbId);
    if (error) {
      console.error("[toggleSvs] update failed", error);
      throw new Error(error.message);
    }
    await fetchWeeks();
  }

  async function setEventActive(weekId: string, eventKey: string, active: boolean) {
    const dbId = getWeekDbId(weekId);
    if (!dbId) throw new Error("No active week selected.");
    if (eventKey === "svs") {
      const { error } = await supabase.from("weekly_events").update({ svs_active: active }).eq("id", dbId);
      if (error) {
        console.error("[setEventActive svs] update failed", error);
        throw new Error(error.message);
      }
      await fetchWeeks();
      return;
    }
    const { error } = await supabase
      .from("weekly_event_toggles")
      .upsert(
        { weekly_event_id: dbId, event_type_key: eventKey, is_active: active } as any,
        { onConflict: "weekly_event_id,event_type_key" }
      );
    if (error) {
      console.error("[setEventActive] upsert failed", error);
      throw new Error(error.message);
    }
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

  /**
   * Snapshot every member's final score (base metrics + this week's event
   * bonus) and flip the week to archived. The snapshot is the source of truth
   * for Rankings/Dashboard once a week is archived.
   */
  async function archiveWeek(weekId: string, ctx: ArchiveContext) {
    const week = [...activeWeeks, ...archivedWeeks].find((w) => w.weekId === weekId);
    if (!week) return;
    const ava = ctx.avaMetric ?? AVA_METRIC;
    const recordedDate = weekEndDate(weekId);

    for (const m of ctx.members) {
      const sources: EventPointSource[] = ctx.eventTypes.map((e) => {
        const toggledOn = isEventActive(weekId, e.key);
        const hasEntries = hasAnyEntries(weekId, e.key, e.inputType);
        return {
          key: e.key,
          inputType: e.inputType,
          pointWeight: e.pointWeight ?? 1,
          isActive: toggledOn && hasEntries,
          status: getStatus(weekId, m.id, e.key),
          value: getValue(weekId, m.id, e.key),
        };
      });
      const bonus = calculateEventPoints(sources, ava);
      await snapshotMemberMetrics({
        member: m,
        source: "auto_weekly",
        weekId,
        thresholds: ctx.thresholds,
        maxPoints: ctx.baseMaxPoints,
        eventBonus: bonus,
        metricDefs: ctx.scoringMetrics,
        recordedDate,
      });
    }

    if (!week.isArchived) {
      await supabase.from("weekly_events").update({ is_archived: true }).eq("id", week.id);
    }
    await fetchWeeks();
  }

  async function startNewWeek(ctx?: ArchiveContext) {
    const currentStart = getWeekStart(new Date());
    const newWeekId = formatWeekId(currentStart);

    const existing = [...activeWeeks, ...archivedWeeks].find(w => w.weekId === newWeekId);
    if (existing) return;

    // Archive oldest active first (with full event-bonus snapshot) if at cap.
    if (activeWeeks.length >= MAX_ACTIVE_WEEKS && ctx) {
      const oldest = activeWeeks[activeWeeks.length - 1];
      await archiveWeek(oldest.weekId, ctx);
    }

    await supabase.from("weekly_events").insert({
      week_id: newWeekId,
      label: formatWeekLabel(currentStart),
      svs_active: true,
      is_archived: false,
    });

    await fetchWeeks();
  }

  const currentCalendarWeekId = formatWeekId(getWeekStart(new Date()));
  const currentWeekExists = [...activeWeeks, ...archivedWeeks].some(w => w.weekId === currentCalendarWeekId);

  return {
    activeWeeks,
    archivedWeeks,
    currentWeek: activeWeeks[0] ?? null,
    currentWeekExists,
    loadError,
    hasSession,
    refresh: refreshAll,
    getStatus,
    getValue,
    setStatus,
    setStatusBulk,
    toggleSvs,
    isEventActive,
    setEventActive,
    hasAnyEntries,
    archiveWeek,
    startNewWeek,
    deleteWeek,
  };
}

type WeeklyEventsValue = ReturnType<typeof useWeeklyEventsState>;
const WeeklyEventsContext = createContext<WeeklyEventsValue | null>(null);

export function WeeklyEventsProvider({ children }: { children: ReactNode }) {
  const value = useWeeklyEventsState();
  return <WeeklyEventsContext.Provider value={value}>{children}</WeeklyEventsContext.Provider>;
}

export function useWeeklyEvents(): WeeklyEventsValue {
  const ctx = useContext(WeeklyEventsContext);
  if (!ctx) {
    throw new Error("useWeeklyEvents must be used within a <WeeklyEventsProvider>");
  }
  return ctx;
}
