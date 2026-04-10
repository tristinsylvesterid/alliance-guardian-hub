import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ArchivedMember, Member } from "@/lib/mock-data";
import type { Json } from "@/integrations/supabase/types";

function rowToArchived(row: {
  id: string;
  name: string;
  leadership_rank: string | null;
  metrics: Json;
  reason: string;
  archived_at: string;
  original_member_id: string | null;
}): ArchivedMember {
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
    leadershipRank: row.leadership_rank,
    metrics,
    reason: row.reason,
    archivedAt: row.archived_at,
    originalMemberId: row.original_member_id,
  };
}

export function useArchivedMembers() {
  const [archivedMembers, setArchivedMembers] = useState<ArchivedMember[]>([]);

  const fetchArchived = useCallback(async () => {
    const { data } = await supabase.from("archived_members").select("*").order("archived_at", { ascending: false });
    if (data) setArchivedMembers(data.map(rowToArchived));
  }, []);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  async function archiveMember(member: Member, reason: string) {
    const metricsJson = member.metrics as unknown as Json;
    await supabase.from("archived_members").insert({
      original_member_id: member.id,
      name: member.name,
      leadership_rank: member.leadershipRank || null,
      metrics: metricsJson,
      reason,
    });
    await fetchArchived();
  }

  return {
    archivedMembers,
    archiveMember,
  };
}
