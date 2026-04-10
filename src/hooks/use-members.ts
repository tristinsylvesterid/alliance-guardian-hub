import { useState, useCallback, useEffect } from "react";
import { MOCK_MEMBERS, type Member } from "@/lib/mock-data";

let globalMembers: Member[] = [...MOCK_MEMBERS];
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export function useMembers() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  function setMembers(updater: Member[] | ((prev: Member[]) => Member[])) {
    globalMembers = typeof updater === "function" ? updater(globalMembers) : updater;
    notify();
  }

  return {
    members: globalMembers,
    setMembers,
  };
}
