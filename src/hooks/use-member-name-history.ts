import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NameHistoryEntry {
  id: string;
  memberId: string;
  previousName: string;
  changedAt: string;
}

export function useMemberNameHistory() {
  const [history, setHistory] = useState<NameHistoryEntry[]>([]);

  const fetchHistory = useCallback(async () => {
    const { data } = await supabase
      .from("member_name_history")
      .select("*")
      .order("changed_at", { ascending: false });
    if (data) {
      setHistory(
        (data as any[]).map((r) => ({
          id: r.id,
          memberId: r.member_id,
          previousName: r.previous_name,
          changedAt: r.changed_at,
        }))
      );
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  async function addPreviousName(memberId: string, previousName: string) {
    const name = previousName.trim();
    if (!name) return;
    await supabase
      .from("member_name_history")
      .insert({ member_id: memberId, previous_name: name } as any);
    await fetchHistory();
  }

  async function removePreviousName(id: string) {
    await supabase.from("member_name_history").delete().eq("id", id);
    await fetchHistory();
  }

  function getHistoryFor(memberId: string): NameHistoryEntry[] {
    return history.filter((h) => h.memberId === memberId);
  }

  function memberMatchesPreviousName(memberId: string, query: string): boolean {
    const q = query.toLowerCase();
    return history.some(
      (h) => h.memberId === memberId && h.previousName.toLowerCase().includes(q)
    );
  }

  return { history, getHistoryFor, addPreviousName, removePreviousName, memberMatchesPreviousName, refresh: fetchHistory };
}
