import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventType {
  key: string;
  name: string;
  hasSvsToggle?: boolean;
  isOptional?: boolean;
  inputType: "status" | "rank";
  pointWeight: number;
  archivedAt: string | null;
}

export function useEventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const fetchEventTypes = useCallback(async () => {
    const { data } = await supabase.from("event_types").select("*").order("created_at");
    if (data) {
      const hasEngagement = data.some((r: any) => r.key === "engagement");
      if (!hasEngagement) {
        await supabase.from("event_types").insert({
          key: "engagement",
          name: "Engagement",
          has_svs_toggle: false,
          is_optional: true,
          input_type: "status",
          point_weight: 1,
        } as any);
        const refetch = await supabase.from("event_types").select("*").order("created_at");
        if (refetch.data) {
          setEventTypes(refetch.data.map((r: any) => ({
            key: r.key,
            name: r.name,
            hasSvsToggle: r.has_svs_toggle,
            isOptional: r.is_optional ?? false,
            inputType: r.input_type === "rank" ? "rank" : "status",
            pointWeight: r.point_weight ?? 1,
            archivedAt: r.archived_at ?? null,
          })));
          return;
        }
      }
      setEventTypes(data.map((r: any) => ({
        key: r.key,
        name: r.name,
        hasSvsToggle: r.has_svs_toggle,
        isOptional: r.is_optional ?? false,
        inputType: r.input_type === "rank" ? "rank" : "status",
        pointWeight: r.point_weight ?? 1,
        archivedAt: r.archived_at ?? null,
      })));
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  const activeEventTypes = useMemo(
    () => eventTypes.filter((e) => !e.archivedAt),
    [eventTypes],
  );
  const archivedEventTypes = useMemo(
    () => eventTypes.filter((e) => !!e.archivedAt),
    [eventTypes],
  );

  async function addEventType(name: string, isOptional = true) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    await supabase.from("event_types").insert({ key, name, has_svs_toggle: false, is_optional: isOptional });
    await fetchEventTypes();
  }

  async function archiveEventType(key: string) {
    const { error } = await supabase
      .from("event_types")
      .update({ archived_at: new Date().toISOString() } as any)
      .eq("key", key);
    if (!error) await fetchEventTypes();
    return { error: error?.message ?? null };
  }

  async function restoreEventType(key: string) {
    const { error } = await supabase
      .from("event_types")
      .update({ archived_at: null } as any)
      .eq("key", key);
    if (!error) await fetchEventTypes();
    return { error: error?.message ?? null };
  }

  /**
   * Permanent delete: removes attendance + toggle rows referencing this key
   * (no FK cascade exists), then deletes the event_type row.
   * Destroys all historical attendance for the event — use with care.
   */
  async function deleteEventTypePermanently(key: string) {
    await supabase.from("event_attendance").delete().eq("event_type_key", key);
    await supabase.from("weekly_event_toggles").delete().eq("event_type_key", key);
    const { error } = await supabase.from("event_types").delete().eq("key", key);
    if (!error) await fetchEventTypes();
    return { error: error?.message ?? null };
  }

  /** @deprecated kept for back-compat; prefer archiveEventType. */
  async function removeEventType(key: string) {
    return archiveEventType(key);
  }

  async function renameEventType(key: string, newName: string) {
    await supabase.from("event_types").update({ name: newName }).eq("key", key);
    await fetchEventTypes();
  }

  async function setOptional(key: string, isOptional: boolean) {
    const { error } = await supabase.from("event_types").update({ is_optional: isOptional }).eq("key", key);
    if (!error) await fetchEventTypes();
    return { error: error?.message ?? null };
  }

  async function setPointWeight(key: string, pointWeight: number) {
    const safe = Math.max(0, Math.round(pointWeight));
    const { error } = await supabase.from("event_types").update({ point_weight: safe }).eq("key", key);
    if (!error) await fetchEventTypes();
    return { error: error?.message ?? null };
  }

  return {
    /** All event types including archived — use for historical views. */
    eventTypes,
    /** Non-archived event types — use for live entry & settings active list. */
    activeEventTypes,
    archivedEventTypes,
    addEventType,
    removeEventType,
    archiveEventType,
    restoreEventType,
    deleteEventTypePermanently,
    renameEventType,
    setOptional,
    setPointWeight,
  };
}
