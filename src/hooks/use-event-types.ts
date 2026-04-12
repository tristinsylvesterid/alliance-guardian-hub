import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EventType {
  key: string;
  name: string;
  hasSvsToggle?: boolean;
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
        inputType: (r as any).input_type === "rank" ? "rank" : "status",
      })));
    }
  }, []);

  useEffect(() => {
    fetchEventTypes();
  }, [fetchEventTypes]);

  async function addEventType(name: string) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    await supabase.from("event_types").insert({ key, name, has_svs_toggle: false });
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

  return {
    eventTypes,
    addEventType,
    removeEventType,
    renameEventType,
  };
}
