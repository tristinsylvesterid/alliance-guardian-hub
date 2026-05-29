import { createServerFn } from "@tanstack/react-start";

export interface ParsedAvaRow {
  rank: number;
  name: string;
  score: number;
}

export const parseAvaScreenshot = createServerFn({ method: "POST" })
  .inputValidator((data: { images: string[] }) => {
    if (!data || !Array.isArray(data.images) || data.images.length === 0) {
      throw new Error("At least one image is required");
    }
    if (data.images.length > 10) {
      throw new Error("Maximum 10 images per request");
    }
    return data;
  })
  .handler(async ({ data }): Promise<{ rows: ParsedAvaRow[] }> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt =
      "You extract player ranking rows from game screenshots of an AvA (Alliance vs Alliance) ranking screen. " +
      "Each row contains: a rank number on the far left (in a medal or as a plain number), a bold player name, an alliance tag line like '[nOva]Bright mf Star' (IGNORE this line), and a large score number on the right with comma separators. " +
      "Return ONE row per visible player. Names may contain unicode/Chinese characters — preserve them exactly. " +
      "Strip commas from scores and return as integers. Ignore UI chrome, tabs, and the 'My Alliance' footer. " +
      "If you see the same rank across multiple images, include it only once.";

    const userContent: Array<
      { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
    > = [
      { type: "text", text: "Extract every player ranking row visible across these screenshots." },
      ...data.images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
    ];

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
              name: "submit_rankings",
              description: "Submit the extracted ranking rows.",
              parameters: {
                type: "object",
                properties: {
                  rows: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        rank: { type: "integer", description: "Rank position shown on the row" },
                        name: { type: "string", description: "Player name (preserve unicode)" },
                        score: { type: "integer", description: "Score with commas stripped" },
                      },
                      required: ["rank", "name", "score"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["rows"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_rankings" } },
      }),
    });

    if (response.status === 429) {
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    }
    if (response.status === 402) {
      throw new Error("AI credits exhausted. Add funds in Workspace → Usage.");
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error (${response.status})`);
    }

    const json = await response.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured response from AI");
    }

    let parsed: { rows?: ParsedAvaRow[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      throw new Error("Failed to parse AI response");
    }

    const rows = (parsed.rows ?? [])
      .filter((r) => typeof r.rank === "number" && typeof r.name === "string")
      .map((r) => ({ rank: r.rank, name: r.name.trim(), score: r.score ?? 0 }));

    // Dedupe by rank, keep first occurrence
    const seen = new Set<number>();
    const deduped: ParsedAvaRow[] = [];
    for (const row of rows.sort((a, b) => a.rank - b.rank)) {
      if (!seen.has(row.rank)) {
        seen.add(row.rank);
        deduped.push(row);
      }
    }

    return { rows: deduped };
  });
