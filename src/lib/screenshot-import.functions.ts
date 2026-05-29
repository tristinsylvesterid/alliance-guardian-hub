import { createServerFn } from "@tanstack/react-start";

export interface ParsedRankRow {
  rank: number;
  name: string;
  score: number;
}

export interface ParsedNameRow {
  name: string;
}

export type ParseResult =
  | { kind: "rank"; rows: ParsedRankRow[] }
  | { kind: "status"; rows: ParsedNameRow[] };

export const parseEventScreenshot = createServerFn({ method: "POST" })
  .inputValidator((data: { images: string[]; inputType: "rank" | "status"; eventName: string }) => {
    if (!data || !Array.isArray(data.images) || data.images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (data.images.length > 10) {
      throw new Error("Maximum 10 images per request");
    }
    if (data.inputType !== "rank" && data.inputType !== "status") {
      throw new Error("Invalid inputType");
    }
    return data;
  })
  .handler(async ({ data }): Promise<ParseResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const isRank = data.inputType === "rank";

    const systemPrompt = isRank
      ? "You extract player ranking rows from game screenshots of an AvA (Alliance vs Alliance) ranking screen. " +
        "Each row contains: a rank number on the far left (in a medal or as a plain number), a bold player name, an alliance tag line like '[nOva]Bright mf Star' (IGNORE this alliance line), and a large score number on the right with comma separators. " +
        "Return ONE row per visible player. Names may contain unicode/Chinese characters — preserve them exactly. " +
        "Strip commas from scores and return as integers. Ignore UI chrome, tabs, and the 'My Alliance' footer. " +
        "If you see the same rank across multiple images, include it only once."
      : `You extract player/commander names from game screenshots related to a Last Z Survival event called "${data.eventName}". ` +
        "Screenshots may be rally participant lists, kill-event leaderboards, march queues, or similar. " +
        "Return ONE entry per unique player name that appears as a participant/attendee. " +
        "IGNORE alliance tags in brackets like [nOva], UI chrome, button labels, headers, and your own commander. " +
        "Names may contain unicode/Chinese characters — preserve them exactly. Dedupe by name.";

    const userText = isRank
      ? "Extract every player ranking row visible across these screenshots."
      : `Extract every unique player/commander name that participated in "${data.eventName}" across these screenshots.`;

    const userContent: Array<
      { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
    > = [
      { type: "text", text: userText },
      ...data.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

    const toolParams = isRank
      ? {
          type: "object" as const,
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rank: { type: "integer" },
                  name: { type: "string" },
                  score: { type: "integer" },
                },
                required: ["rank", "name", "score"],
                additionalProperties: false,
              },
            },
          },
          required: ["rows"],
          additionalProperties: false,
        }
      : {
          type: "object" as const,
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: { name: { type: "string" } },
                required: ["name"],
                additionalProperties: false,
              },
            },
          },
          required: ["rows"],
          additionalProperties: false,
        };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_rows",
              description: "Submit extracted rows.",
              parameters: toolParams,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_rows" } },
      }),
    });

    if (response.status === 429) throw new Error("Rate limit reached. Please wait a moment and try again.");
    if (response.status === 402) throw new Error("AI credits exhausted. Add funds in Workspace → Usage.");
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error (${response.status})`);
    }

    const json = await response.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("No structured response from AI");

    let parsed: { rows?: Array<{ rank?: number; name?: string; score?: number }> };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    if (isRank) {
      const rows = (parsed.rows ?? [])
        .filter((r) => typeof r.rank === "number" && typeof r.name === "string")
        .map((r) => ({ rank: r.rank as number, name: (r.name as string).trim(), score: r.score ?? 0 }));
      const seen = new Set<number>();
      const deduped: ParsedRankRow[] = [];
      for (const row of rows.sort((a, b) => a.rank - b.rank)) {
        if (!seen.has(row.rank)) {
          seen.add(row.rank);
          deduped.push(row);
        }
      }
      return { kind: "rank", rows: deduped };
    }

    const names = (parsed.rows ?? [])
      .filter((r) => typeof r.name === "string" && r.name.trim().length > 0)
      .map((r) => ({ name: (r.name as string).trim() }));
    const seenName = new Set<string>();
    const dedupedNames: ParsedNameRow[] = [];
    for (const row of names) {
      const k = row.name.toLowerCase();
      if (!seenName.has(k)) {
        seenName.add(k);
        dedupedNames.push(row);
      }
    }
    return { kind: "status", rows: dedupedNames };
  });
