import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventType {
  key: string;
  name: string;
  hasSvsToggle?: boolean;
  isOptional?: boolean;
  inputType: "status" | "rank";
}

export function useEventTypes() {
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);

  const fetchEventTypes = useCallback(async () => {
    const { data } = await supabase.from("event_types").select("*").order("created_at");
    if (data) {
      setEventTypes(data.map((r) => ({
        key: r.key,
        name: r.name,
        hasSvsToggle: r.has_svs_toggle,
        isOptional: (r as any).is_optional ?? false,
        inputType: (r as any).input_type === "rank" ? "rank" : "status",
      })));
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  async function addEventType(name: string, isOptional = false) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    await supabase.from("event_types").insert({ key, name, has_svs_toggle: false, is_optional: isOptional });
    await fetchEventTypes();
  }

  async function removeEventType(key: string) {
    await supabase.from("event_types").delete().eq("key", key);
    await fetchEventTypes();
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

  return {
    eventTypes,
    addEventType,
    removeEventType,
    renameEventType,
    setOptional,
  };
}
