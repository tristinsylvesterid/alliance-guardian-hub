import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Member } from "@/lib/mock-data";
import type { Json } from "@/integrations/supabase/types";

function rowToMember(row: {
  id: string;
  name: string;
  leadership_rank: string | null;
  metrics: Json;
  location_x: number;
  location_y: number;
}): Member {
  const rawMetrics = (row.metrics && typeof row.metrics === "object" && !Array.isArray(row.metrics))
    ? row.metrics as Record<string, Json>
    : {};
  const metrics: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(rawMetrics)) {
    if (typeof v === "number" || typeof v === "boolean" || typeof v === "string") {
      metrics[k] = v;
    }
  }
  return {
    id: row.id,
    name: row.name,
    leadershipRank: row.leadership_rank as "R4" | "R5" | undefined,
    metrics,
    locationX: row.location_x,
    locationY: row.location_y,
    events: {},
  };
}

export function useMembers() {
  const [members, setMembersState] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    const { data } = await supabase.from("members").select("*").order("name");
    if (data) setMembersState(data.map(rowToMember));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
    const channel = supabase
      .channel("members-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => {
        fetchMembers();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchMembers]);

  async function saveMember(member: Member) {
    const metricsJson = member.metrics as unknown as Json;
    await supabase.from("members").upsert({
      id: member.id,
      name: member.name,
      leadership_rank: member.leadershipRank || null,
      metrics: metricsJson,
      location_x: member.locationX ?? (typeof member.metrics.locationX === "number" ? member.metrics.locationX : 0),
      location_y: member.locationY ?? (typeof member.metrics.locationY === "number" ? member.metrics.locationY : 0),
    }).select().single();
    await fetchMembers();
    return member;
  }

  async function deleteMember(id: string) {
    await supabase.from("members").delete().eq("id", id);
    await fetchMembers();
  }

  async function updateMemberLocation(id: string, locationX: number, locationY: number) {
    await supabase.from("members").update({ location_x: locationX, location_y: locationY }).eq("id", id);
    await fetchMembers();
  }

  async function updateMemberMetrics(id: string, metrics: Record<string, number | boolean | string>) {
    await supabase.from("members").update({ metrics: metrics as unknown as Json }).eq("id", id);
    await fetchMembers();
  }

  return {
    members,
    loading,
    saveMember,
    deleteMember,
    updateMemberLocation,
    updateMemberMetrics,
    refetch: fetchMembers,
  };
}
