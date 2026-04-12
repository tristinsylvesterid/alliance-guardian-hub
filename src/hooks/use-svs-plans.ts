import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/lib/mock-data";

export type PollResponse = "yes" | "no" | "didnt_answer" | "";
export type SvsTeam = "team1" | "team2" | "team3" | "team4" | "fighting_elsewhere";
export type SvsRole = "fighter" | "deputy" | "commander" | "intel_officer";
export type SvsMode = "invading" | "defending" | "";
export type SvsResult = "win" | "lose" | "";
export type SvsWeek = "1" | "2" | "";

export interface SvsMemberEntry {
  memberId: string;
  name: string;
  power: number;
  pollResponse: PollResponse;
  team: SvsTeam;
  role: SvsRole;
  locationX: number;
  locationY: number;
  hasT10s: boolean;
}

export interface SvsPlan {
  id: string;
  label: string;
  createdAt: string;
  mode: SvsMode;
  opponentServer: string;
  svsWeek: SvsWeek;
  result: SvsResult;
  capitalPercentage: number;
  notes: string;
  entries: SvsMemberEntry[];
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
  const [plans, setPlans] = useState<SvsPlan[]>([]);

  const fetchPlans = useCallback(async () => {
    const { data: planRows } = await supabase
      .from("svs_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!planRows) return;

    const { data: entryRows } = await supabase.from("svs_plan_entries").select("*");
    const entriesByPlan: Record<string, SvsMemberEntry[]> = {};
    if (entryRows) {
      for (const e of entryRows) {
        if (!entriesByPlan[e.plan_id]) entriesByPlan[e.plan_id] = [];
        entriesByPlan[e.plan_id].push({
          memberId: e.member_id,
          name: e.name,
          power: e.power,
          pollResponse: e.poll_response as PollResponse,
          team: e.team as SvsTeam,
          role: e.role as SvsRole,
          locationX: e.location_x,
          locationY: e.location_y,
          hasT10s: e.has_t10s,
        });
      }
    }

    setPlans(planRows.map((p) => ({
      id: p.id,
      label: p.label,
      createdAt: p.created_at,
      mode: p.mode as SvsMode,
      opponentServer: p.opponent_server,
      svsWeek: p.svs_week as SvsWeek,
      result: p.result as SvsResult,
      capitalPercentage: p.capital_percentage,
      notes: p.notes,
      entries: entriesByPlan[p.id] || [],
    })));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  async function createPlan(members: Member[]): Promise<string> {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
    const daysUntilSaturday = dayOfWeek === 6 ? 7 : (6 - dayOfWeek);
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    const label = nextSaturday.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const { data: planRow } = await supabase
      .from("svs_plans")
      .insert({ label })
      .select()
      .single();

    if (!planRow) throw new Error("Failed to create plan");

    const entries = members.map((m) => ({
      plan_id: planRow.id,
      member_id: m.id,
      name: m.name,
      power: 0,
      poll_response: "",
      team: "team4",
      role: "fighter",
      location_x: m.locationX ?? 0,
      location_y: m.locationY ?? 0,
      has_t10s: false,
    }));

    if (entries.length > 0) {
      await supabase.from("svs_plan_entries").insert(entries);
    }

    await fetchPlans();
    return planRow.id;
  }

  async function updateEntry(planId: string, memberId: string, updates: Partial<SvsMemberEntry>) {
    const dbUpdates: {
      power?: number;
      poll_response?: string;
      team?: string;
      role?: string;
      location_x?: number;
      location_y?: number;
      name?: string;
      has_t10s?: boolean;
    } = {};
    if (updates.power !== undefined) dbUpdates.power = updates.power;
    if (updates.pollResponse !== undefined) dbUpdates.poll_response = updates.pollResponse;
    if (updates.team !== undefined) dbUpdates.team = updates.team;
    if (updates.role !== undefined) dbUpdates.role = updates.role;
    if (updates.locationX !== undefined) dbUpdates.location_x = updates.locationX;
    if (updates.locationY !== undefined) dbUpdates.location_y = updates.locationY;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.hasT10s !== undefined) dbUpdates.has_t10s = updates.hasT10s;

    await supabase
      .from("svs_plan_entries")
      .update(dbUpdates)
      .eq("plan_id", planId)
      .eq("member_id", memberId);
    await fetchPlans();
  }

  async function updatePlan(planId: string, updates: Partial<Pick<SvsPlan, "mode" | "opponentServer" | "svsWeek" | "result" | "capitalPercentage" | "notes">>) {
    const dbUpdates: {
      mode?: string;
      opponent_server?: string;
      svs_week?: string;
      result?: string;
      capital_percentage?: number;
      notes?: string;
    } = {};
    if (updates.mode !== undefined) dbUpdates.mode = updates.mode;
    if (updates.opponentServer !== undefined) dbUpdates.opponent_server = updates.opponentServer;
    if (updates.svsWeek !== undefined) dbUpdates.svs_week = updates.svsWeek;
    if (updates.result !== undefined) dbUpdates.result = updates.result;
    if (updates.capitalPercentage !== undefined) dbUpdates.capital_percentage = updates.capitalPercentage;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

    await supabase.from("svs_plans").update(dbUpdates).eq("id", planId);
    await fetchPlans();
  }

  async function deletePlan(planId: string) {
    await supabase.from("svs_plans").delete().eq("id", planId);
    await fetchPlans();
  }

  return {
    plans,
    createPlan,
    updateEntry,
    updatePlan,
    deletePlan,
  };
}
