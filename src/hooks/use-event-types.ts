import { useState, useCallback, useEffect } from "react";
import { EVENT_TYPES as INITIAL_EVENT_TYPES } from "@/lib/mock-data";

export interface EventType {
  key: string;
  name: string;
  hasSvsToggle?: boolean; // only "svs" has the toggle behavior
}

let globalEventTypes: EventType[] = INITIAL_EVENT_TYPES.map((e) => ({
  ...e,
  hasSvsToggle: e.key === "svs",
}));
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function useEventTypes() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  function addEventType(name: string) {
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/(^_|_$)/g, "");
    if (globalEventTypes.some((e) => e.key === key)) return;
    globalEventTypes = [...globalEventTypes, { key, name, hasSvsToggle: false }];
    notify();
  }

  function removeEventType(key: string) {
    globalEventTypes = globalEventTypes.filter((e) => e.key !== key);
    notify();
  }

  function renameEventType(key: string, newName: string) {
    globalEventTypes = globalEventTypes.map((e) =>
      e.key === key ? { ...e, name: newName } : e
    );
    notify();
  }

  return {
    eventTypes: globalEventTypes,
    addEventType,
    removeEventType,
    renameEventType,
  };
}
