import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface WeeklyPoll {
  id: string;
  weeklyEventId: string;
  name: string;
}

export function useWeeklyPolls() {
  const [polls, setPolls] = useState<WeeklyPoll[]>([]);
  // responses[pollId][memberId] = boolean
  const [responses, setResponses] = useState<Record<string, Record<string, boolean>>>({});

  const fetchPolls = useCallback(async () => {
    const { data } = await supabase.from("weekly_polls").select("*").order("created_at");
    if (data) {
      setPolls(data.map((r: any) => ({ id: r.id, weeklyEventId: r.weekly_event_id, name: r.name })));
    }
  }, []);

  const fetchResponses = useCallback(async () => {
    const { data } = await supabase.from("poll_responses").select("*");
    if (data) {
      const cache: Record<string, Record<string, boolean>> = {};
      for (const r of data as any[]) {
        if (!cache[r.poll_id]) cache[r.poll_id] = {};
        cache[r.poll_id][r.member_id] = r.responded;
      }
      setResponses(cache);
    }
  }, []);

  useEffect(() => {
    fetchPolls();
    fetchResponses();
  }, [fetchPolls, fetchResponses]);

  async function addPoll(weeklyEventId: string, name: string) {
    await supabase.from("weekly_polls").insert({ weekly_event_id: weeklyEventId, name } as any);
    await fetchPolls();
  }

  async function removePoll(pollId: string) {
    await supabase.from("poll_responses").delete().eq("poll_id", pollId);
    await supabase.from("weekly_polls").delete().eq("id", pollId);
    await fetchPolls();
    await fetchResponses();
  }

  async function renamePoll(pollId: string, name: string) {
    await supabase.from("weekly_polls").update({ name } as any).eq("id", pollId);
    await fetchPolls();
  }

  async function setResponse(pollId: string, memberId: string, responded: boolean) {
    await supabase.from("poll_responses").upsert(
      { poll_id: pollId, member_id: memberId, responded } as any,
      { onConflict: "poll_id,member_id" }
    );
    await fetchResponses();
  }

  function getPollsForWeek(weeklyEventId: string): WeeklyPoll[] {
    return polls.filter((p) => p.weeklyEventId === weeklyEventId);
  }

  function getResponse(pollId: string, memberId: string): boolean {
    return responses[pollId]?.[memberId] ?? false;
  }

  return { polls, getPollsForWeek, addPoll, removePoll, renamePoll, getResponse, setResponse };
}
