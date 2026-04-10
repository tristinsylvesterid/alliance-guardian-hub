import { useState, useCallback, useEffect } from "react";
import type { Member } from "@/lib/mock-data";

export type PollResponse = "yes" | "no" | "";
export type SvsTeam = "team1" | "team2" | "team3" | "team4" | "fighting_elsewhere";
export type SvsRole = "fighter" | "deputy" | "commander" | "intel_officer";

export interface SvsMemberEntry {
  memberId: string;
  name: string;
  power: number;
  pollResponse: PollResponse;
  team: SvsTeam;
  role: SvsRole;
}

export interface SvsPlan {
  id: string;
  label: string;
  createdAt: string;
  entries: SvsMemberEntry[];
}

let globalPlans: SvsPlan[] = [];
let listeners: Set<() => void> = new Set();

function notify() {
  listeners.forEach((l) => l());
}

export const TEAM_LABELS: Record<SvsTeam, string> = {
  team1: "Team 1",
  team2: "Team 2",
  team3: "Team 3",
  team4: "Team 4",
  fighting_elsewhere: "Fighting Elsewhere",
};

export const ROLE_LABELS: Record<SvsRole, string> = {
  fighter: "Fighter",
  deputy: "Deputy",
  commander: "Commander",
  intel_officer: "Intel Officer",
};

export function useSvsPlans() {
  const [, setTick] = useState(0);
  const rerender = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    listeners.add(rerender);
    return () => { listeners.delete(rerender); };
  }, [rerender]);

  function createPlan(members: Member[]): SvsPlan {
    const now = new Date();
    const plan: SvsPlan = {
      id: `svs-${Date.now()}`,
      label: now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      createdAt: now.toISOString(),
      entries: members.map((m) => ({
        memberId: m.id,
        name: m.name,
        power: typeof m.metrics.techPower === "number" ? m.metrics.techPower : 0,
        pollResponse: "" as PollResponse,
        team: "team1" as SvsTeam,
        role: "fighter" as SvsRole,
      })),
    };
    globalPlans = [plan, ...globalPlans];
    notify();
    return plan;
  }

  function updateEntry(planId: string, memberId: string, updates: Partial<SvsMemberEntry>) {
    globalPlans = globalPlans.map((p) => {
      if (p.id !== planId) return p;
      return {
        ...p,
        entries: p.entries.map((e) =>
          e.memberId === memberId ? { ...e, ...updates } : e
        ),
      };
    });
    notify();
  }

  function deletePlan(planId: string) {
    globalPlans = globalPlans.filter((p) => p.id !== planId);
    notify();
  }

  return {
    plans: globalPlans,
    createPlan,
    updateEntry,
    deletePlan,
  };
}
