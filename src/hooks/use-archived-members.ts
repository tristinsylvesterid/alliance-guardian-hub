import { useState, useCallback } from "react";
import type { ArchivedMember } from "@/lib/mock-data";

let globalArchive: ArchivedMember[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function useArchivedMembers() {
  const [, setTick] = useState(0);

  const rerender = useCallback(() => setTick((t) => t + 1), []);

  if (!listeners.includes(rerender)) {
    listeners.push(rerender);
  }

  function archiveMember(entry: ArchivedMember) {
    globalArchive = [...globalArchive, entry];
    notify();
  }

  return {
    archivedMembers: globalArchive,
    archiveMember,
  };
}
