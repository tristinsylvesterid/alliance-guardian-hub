import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMembers } from "@/hooks/use-members";
import { useMetricsHistory, type MetricsHistoryEntry } from "@/hooks/use-metrics-history";
import { useScoringConfig } from "@/hooks/use-scoring-config";
import { useRankThresholds } from "@/hooks/use-rank-thresholds";
import { useWeeklyEvents } from "@/hooks/use-weekly-events";
import { useEventTypes } from "@/hooks/use-event-types";
import {
  calculateTotalScore,
  getRank,
  calculateMetricPoints,
  type Rank,
} from "@/lib/scoring";
import { exportCsv } from "@/lib/csv";
import { RankBadge } from "@/components/RankBadge";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";

export const Route = createFileRoute("/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics | nOva Alliance Manager" },
      { name: "description", content: "Performance analytics across your alliance" },
    ],
  }),
});

// ---------- helpers ----------

type MetricCardSpec = {
  key: string;
  label: string;
  unit?: string;
  lowerIsBetter?: boolean;
  format?: (n: number) => string;
};

const METRIC_CARDS: MetricCardSpec[] = [
  { key: "hqLevel", label: "Avg HQ Level" },
  { key: "rallyCap", label: "Avg Rally Cap" },
  { key: "allianceRecognition", label: "Alliance Recognition", unit: "%" },
  { key: "pcHeroes", label: "Avg PC Heroes" },
  { key: "techPower", label: "Avg Tech Power", unit: "M" },
  { key: "vehiclePower", label: "Avg Vehicle Power", unit: "M" },
  { key: "killCount", label: "Avg Kill Count", unit: "M" },
];

function fmt(n: number, digits = 1): string {
  if (!isFinite(n)) return "—";
  return n.toFixed(digits);
}

function avgOf(values: number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function modeOf<T extends string | number>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best: T | null = null;
  let bestC = -1;
  for (const [k, c] of counts) {
    if (c > bestC) { best = k; bestC = c; }
  }
  return best;
}

function pickNumber(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  return null;
}

// Returns the snapshot for each member on-or-before the given date.
function snapshotsAsOf(
  history: MetricsHistoryEntry[],
  asOf: Date,
): Map<string, MetricsHistoryEntry> {
  const cutoff = asOf.getTime();
  const result = new Map<string, MetricsHistoryEntry>();
  for (const h of history) {
    if (new Date(h.recordedAt).getTime() > cutoff) continue;
    const existing = result.get(h.memberId);
    if (!existing || new Date(existing.recordedAt).getTime() < new Date(h.recordedAt).getTime()) {
      result.set(h.memberId, h);
    }
  }
  return result;
}

// ---------- page ----------

function AnalyticsPage() {
  const { members } = useMembers();
  const { history } = useMetricsHistory();
  const { metrics: scoringMetrics, maxTotal } = useScoringConfig();
  const { thresholds } = useRankThresholds();
  const { activeWeeks, archivedWeeks, getStatus } = useWeeklyEvents();
  const { eventTypes } = useEventTypes();

  const [weeksWindow, setWeeksWindow] = useState<number>(12);

  // -------- KPI cards (current avg + delta vs ~28 days ago) --------
  const kpiCards = useMemo(() => {
    const past = new Date();
    past.setDate(past.getDate() - 28);
    const pastSnap = snapshotsAsOf(history, past);
    return METRIC_CARDS.map((spec) => {
      const current: number[] = [];
      for (const m of members) {
        const n = pickNumber(m.metrics[spec.key]);
        if (n !== null) current.push(n);
      }
      const previous: number[] = [];
      for (const snap of pastSnap.values()) {
        const n = pickNumber(snap.metrics[spec.key]);
        if (n !== null) previous.push(n);
      }
      const cur = avgOf(current);
      const prev = avgOf(previous);
      let deltaPct: number | null = null;
      if (isFinite(cur) && isFinite(prev) && prev !== 0) {
        deltaPct = ((cur - prev) / prev) * 100;
      }
      return { spec, cur, prev, deltaPct };
    });
  }, [members, history]);

  const troopModeNow = useMemo(() => {
    const vals = members
      .map((m) => (typeof m.metrics.troops === "string" ? m.metrics.troops : null))
      .filter((v): v is string => !!v);
    return modeOf(vals) ?? "—";
  }, [members]);

  const totalPowerNow = useMemo(
    () => members.reduce((a, m) => a + (m.power ?? 0), 0),
    [members],
  );

  // -------- Alliance Overview --------
  const overview = useMemo(() => {
    const totalMembers = members.length;
    const r3plus = members.filter((m) => {
      const r = getRank(calculateTotalScore(m.metrics), m.leadershipRank, thresholds, maxTotal);
      return r === "R3" || r === "R4" || r === "R5";
    }).length;
    // attendance % over last 4 weeks across all status events
    const recent = activeWeeks.slice(0, 4);
    let attended = 0;
    let total = 0;
    for (const w of recent) {
      for (const m of members) {
        for (const e of eventTypes) {
          if (e.inputType !== "status") continue;
          const s = getStatus(w.weekId, m.id, e.key);
          if (s === "na") continue;
          total += 1;
          if (s === "check") attended += 1;
        }
      }
    }
    const attendancePct = total > 0 ? (attended / total) * 100 : 0;
    const avgScore =
      members.length > 0
        ? members.reduce((a, m) => a + calculateTotalScore(m.metrics), 0) / members.length
        : 0;
    return { totalMembers, r3plus, attendancePct, avgScore };
  }, [members, thresholds, maxTotal, activeWeeks, eventTypes, getStatus]);

  // -------- Attendance over time (per status event) --------
  const allWeeksSorted = useMemo(() => {
    const all = [...activeWeeks, ...archivedWeeks];
    return all
      .slice()
      .sort((a, b) => a.weekId.localeCompare(b.weekId))
      .slice(-weeksWindow);
  }, [activeWeeks, archivedWeeks, weeksWindow]);

  const attendanceSeries = useMemo(() => {
    const statusEvents = eventTypes.filter((e) => e.inputType === "status");
    return allWeeksSorted.map((w) => {
      const row: Record<string, number | string> = { week: w.label };
      for (const e of statusEvents) {
        let attended = 0;
        let total = 0;
        for (const m of members) {
          const s = getStatus(w.weekId, m.id, e.key);
          if (s === "na") continue;
          total += 1;
          if (s === "check") attended += 1;
        }
        row[e.name] = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
      }
      return row;
    });
  }, [allWeeksSorted, eventTypes, members, getStatus]);

  // -------- Member Progression (from history, bucketed by week) --------
  const progressionSeries = useMemo(() => {
    return allWeeksSorted.map((w) => {
      const asOf = new Date(w.weekId);
      asOf.setDate(asOf.getDate() + 6); // end of week
      const snap = snapshotsAsOf(history, asOf);
      const list = Array.from(snap.values());
      const hq = list
        .map((s) => pickNumber(s.metrics.hqLevel))
        .filter((n): n is number => n !== null);
      const power = list.map((s) => s.power);
      const kill = list
        .map((s) => pickNumber(s.metrics.killCount))
        .filter((n): n is number => n !== null);
      const score = list.map((s) => s.totalScore);
      return {
        week: w.label,
        "Avg HQ": Math.round(avgOf(hq) * 10) / 10,
        "Avg Power": Math.round(avgOf(power)),
        "Total Kills (M)": Math.round(kill.reduce((a, b) => a + b, 0) * 10) / 10,
        "Avg Score": Math.round(avgOf(score) * 10) / 10,
      };
    });
  }, [allWeeksSorted, history]);

  // Rank distribution stacked area from history
  const rankDistSeries = useMemo(() => {
    return allWeeksSorted.map((w) => {
      const asOf = new Date(w.weekId);
      asOf.setDate(asOf.getDate() + 6);
      const snap = snapshotsAsOf(history, asOf);
      const counts: Record<string, number> = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0 };
      for (const s of snap.values()) {
        const r = (s.rank as Rank) ?? "R1";
        counts[r] = (counts[r] ?? 0) + 1;
      }
      return { week: w.label, ...counts };
    });
  }, [allWeeksSorted, history]);

  // -------- AvA performance --------
  const avaSeries = useMemo(() => {
    return allWeeksSorted.map((w) => {
      const ranks: number[] = [];
      const buckets = { "Top 30": 0, "31-50": 0, "51-70": 0, "71+": 0 };
      for (const m of members) {
        const val = m.metrics.avaWeeklyScore;
        const n = pickNumber(val);
        // Only count if a status entry exists this week (best-effort: just use current)
        if (n === null || n === 0) continue;
        ranks.push(n);
        if (n <= 30) buckets["Top 30"]++;
        else if (n <= 50) buckets["31-50"]++;
        else if (n <= 70) buckets["51-70"]++;
        else buckets["71+"]++;
      }
      // Approximate (current value applied per week until real per-week storage)
      void w;
      return {
        week: w.label,
        "Avg Rank": ranks.length ? Math.round(avgOf(ranks) * 10) / 10 : 0,
        ...buckets,
      };
    });
  }, [allWeeksSorted, members]);

  // -------- Member drilldown --------
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const memberHistory = useMemo(
    () =>
      history
        .filter((h) => h.memberId === selectedMemberId)
        .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
        .map((h) => ({
          date: h.recordedDate,
          Power: h.power,
          Score: h.totalScore,
          HQ: pickNumber(h.metrics.hqLevel) ?? 0,
          "Kills (M)": pickNumber(h.metrics.killCount) ?? 0,
        })),
    [history, selectedMemberId],
  );

  // -------- CSV exporters --------
  function exportKpis() {
    exportCsv(
      "kpis",
      kpiCards,
      [
        { header: "Metric", accessor: (c) => c.spec.label },
        { header: "Current", accessor: (c) => (isFinite(c.cur) ? c.cur : "") },
        { header: "Previous (~28d)", accessor: (c) => (isFinite(c.prev) ? c.prev : "") },
        { header: "Delta %", accessor: (c) => (c.deltaPct === null ? "" : c.deltaPct.toFixed(2)) },
      ],
    );
  }

  function exportAttendance() {
    exportCsv(
      "attendance_over_time",
      attendanceSeries,
      Object.keys(attendanceSeries[0] ?? { week: "" }).map((k) => ({
        header: k,
        accessor: (r: Record<string, number | string>) => r[k] ?? "",
      })),
    );
  }

  function exportProgression() {
    exportCsv(
      "member_progression",
      progressionSeries,
      Object.keys(progressionSeries[0] ?? { week: "" }).map((k) => ({
        header: k,
        accessor: (r: Record<string, number | string>) => r[k] ?? "",
      })),
    );
  }

  function exportRankDist() {
    exportCsv(
      "rank_distribution",
      rankDistSeries,
      Object.keys(rankDistSeries[0] ?? { week: "" }).map((k) => ({
        header: k,
        accessor: (r: Record<string, number | string>) => r[k] ?? "",
      })),
    );
  }

  function exportAva() {
    exportCsv(
      "ava_performance",
      avaSeries,
      Object.keys(avaSeries[0] ?? { week: "" }).map((k) => ({
        header: k,
        accessor: (r: Record<string, number | string>) => r[k] ?? "",
      })),
    );
  }

  function exportLeaderboard() {
    const rows = members
      .map((m) => {
        const score = calculateTotalScore(m.metrics);
        const rank = getRank(score, m.leadershipRank, thresholds, maxTotal);
        const memberSnaps = history
          .filter((h) => h.memberId === m.id)
          .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        const earliest = memberSnaps[0];
        const improvement = earliest ? score - earliest.totalScore : 0;
        return { name: m.name, rank, score, power: m.power, improvement };
      })
      .sort((a, b) => b.score - a.score);
    exportCsv(
      "leaderboard",
      rows,
      [
        { header: "Name", accessor: (r) => r.name },
        { header: "Rank", accessor: (r) => r.rank },
        { header: "Score", accessor: (r) => r.score },
        { header: "Power", accessor: (r) => r.power },
        { header: "Improvement (since first snapshot)", accessor: (r) => r.improvement },
      ],
    );
  }

  function exportMember() {
    if (!selectedMemberId) return;
    const m = members.find((mm) => mm.id === selectedMemberId);
    const rows = history.filter((h) => h.memberId === selectedMemberId);
    exportCsv(
      `member_${(m?.name ?? "member").replace(/[^a-z0-9]+/gi, "_")}`,
      rows,
      [
        { header: "Date", accessor: (r) => r.recordedDate },
        { header: "Total Score", accessor: (r) => r.totalScore },
        { header: "Rank", accessor: (r) => r.rank ?? "" },
        { header: "Power", accessor: (r) => r.power },
        { header: "HQ", accessor: (r) => pickNumber(r.metrics.hqLevel) ?? "" },
        { header: "Troops", accessor: (r) => String(r.metrics.troops ?? "") },
        { header: "Kill Count (M)", accessor: (r) => pickNumber(r.metrics.killCount) ?? "" },
        { header: "Tech Power (M)", accessor: (r) => pickNumber(r.metrics.techPower) ?? "" },
        { header: "Vehicle Power (M)", accessor: (r) => pickNumber(r.metrics.vehiclePower) ?? "" },
        { header: "Source", accessor: (r) => r.source },
      ],
    );
  }

  // Leaderboard data
  const leaderboard = useMemo(() => {
    return members
      .map((m) => {
        const score = calculateTotalScore(m.metrics);
        const rank = getRank(score, m.leadershipRank, thresholds, maxTotal);
        const memberSnaps = history
          .filter((h) => h.memberId === m.id)
          .sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
        const earliest = memberSnaps[0];
        const improvement = earliest ? score - earliest.totalScore : 0;
        return { id: m.id, name: m.name, rank, score, power: m.power, improvement };
      });
  }, [members, thresholds, maxTotal, history]);

  const RANK_COLORS: Record<string, string> = {
    R1: "hsl(var(--rank-r1, 0 60% 55%))",
    R2: "hsl(var(--rank-r2, 35 90% 55%))",
    R3: "hsl(var(--rank-r3, 200 85% 60%))",
    R4: "hsl(var(--rank-r4, 280 70% 65%))",
    R5: "hsl(var(--rank-r5, 45 90% 55%))",
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-wide text-gold">Analytics</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Performance trends across the alliance. Trend deltas compare to the closest snapshot ~28 days ago.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Window:</span>
            <Select value={String(weeksWindow)} onValueChange={(v) => setWeeksWindow(parseInt(v, 10))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4 weeks</SelectItem>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks</SelectItem>
                <SelectItem value="26">26 weeks</SelectItem>
                <SelectItem value="999">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI cards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Average Stats</CardTitle>
              <CardDescription>Current alliance averages with 4-week trend</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportKpis}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {kpiCards.map(({ spec, cur, prev, deltaPct }) => {
                const improved =
                  deltaPct === null
                    ? null
                    : spec.lowerIsBetter
                    ? deltaPct < 0
                    : deltaPct > 0;
                const Icon = deltaPct === null ? Minus : improved ? TrendingUp : TrendingDown;
                const color =
                  deltaPct === null
                    ? "text-muted-foreground"
                    : improved
                    ? "text-emerald-400"
                    : "text-rose-400";
                void prev;
                return (
                  <div key={spec.key} className="rounded-lg bg-secondary/50 p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{spec.label}</div>
                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-gold">{fmt(cur)}</span>
                      {spec.unit && <span className="text-xs text-muted-foreground">{spec.unit}</span>}
                    </div>
                    <div className={`mt-1 flex items-center gap-1 text-xs ${color}`}>
                      <Icon className="h-3 w-3" />
                      {deltaPct === null ? "no baseline" : `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs 4w`}
                    </div>
                  </div>
                );
              })}
              {/* Extra non-numeric / aggregate cards */}
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Most Common Troops</div>
                <div className="mt-1 text-2xl font-bold text-gold">{troopModeNow}</div>
                <div className="mt-1 text-xs text-muted-foreground">modal tier</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Total Power</div>
                <div className="mt-1 text-2xl font-bold text-gold">{Math.round(totalPowerNow).toLocaleString()}</div>
                <div className="mt-1 text-xs text-muted-foreground">sum of all members</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Avg Score</div>
                <div className="mt-1 text-2xl font-bold text-gold">
                  {fmt(overview.avgScore)}<span className="text-sm text-muted-foreground">/{maxTotal}</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">across {overview.totalMembers} members</div>
              </div>
              <div className="rounded-lg bg-secondary/50 p-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">R3+ Members</div>
                <div className="mt-1 text-2xl font-bold text-gold">{overview.r3plus}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {overview.totalMembers > 0 ? Math.round((overview.r3plus / overview.totalMembers) * 100) : 0}% of alliance
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alliance overview strip */}
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-gold">Alliance Overview</CardTitle>
            <CardDescription>Recent 4-week attendance and roster snapshot</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-gold">{overview.totalMembers}</div>
                <div className="text-xs text-muted-foreground">Active Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gold">{overview.r3plus}</div>
                <div className="text-xs text-muted-foreground">R3+ Members</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gold">{fmt(overview.attendancePct)}%</div>
                <div className="text-xs text-muted-foreground">4-Week Attendance</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-gold">{Math.round(totalPowerNow).toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Combat Power</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance over time */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Attendance Over Time</CardTitle>
              <CardDescription>% of members attending each event per week</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportAttendance}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={attendanceSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                {eventTypes
                  .filter((e) => e.inputType === "status")
                  .map((e, i) => (
                    <Line
                      key={e.key}
                      type="monotone"
                      dataKey={e.name}
                      stroke={`hsl(${(i * 53) % 360}, 70%, 60%)`}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Member progression */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Member Progression</CardTitle>
              <CardDescription>From recorded history snapshots</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportProgression}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={progressionSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="Avg HQ" stroke="hsl(45 90% 55%)" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="Avg Score" stroke="hsl(280 70% 65%)" strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="Total Kills (M)" stroke="hsl(0 60% 55%)" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="Avg Power" stroke="hsl(200 85% 60%)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rank distribution */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Rank Distribution Over Time</CardTitle>
              <CardDescription>Based on snapshot rank at end of each week</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportRankDist}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rankDistSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                {["R1", "R2", "R3", "R4", "R5"].map((r) => (
                  <Area
                    key={r}
                    type="monotone"
                    dataKey={r}
                    stackId="1"
                    stroke={RANK_COLORS[r]}
                    fill={RANK_COLORS[r]}
                    fillOpacity={0.6}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AvA Performance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">AvA Performance</CardTitle>
              <CardDescription>Member rank distribution per week (lower is better)</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportAva}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avaSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                <Legend />
                <Bar dataKey="Top 30" stackId="a" fill="hsl(140 70% 55%)" />
                <Bar dataKey="31-50" stackId="a" fill="hsl(200 85% 60%)" />
                <Bar dataKey="51-70" stackId="a" fill="hsl(45 90% 55%)" />
                <Bar dataKey="71+" stackId="a" fill="hsl(0 60% 55%)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leaderboards */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Leaderboards</CardTitle>
              <CardDescription>Top contributors and most improved</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={exportLeaderboard}>
              <Download className="h-3.5 w-3.5 mr-2" />CSV
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="top">
              <TabsList>
                <TabsTrigger value="top">Top Contributors</TabsTrigger>
                <TabsTrigger value="improved">Most Improved</TabsTrigger>
                <TabsTrigger value="risk">At Risk</TabsTrigger>
              </TabsList>
              <TabsContent value="top" className="space-y-2 mt-3">
                {leaderboard
                  .slice()
                  .sort((a, b) => b.score - a.score)
                  .slice(0, 10)
                  .map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-2.5">
                      <span className="w-6 text-center font-heading text-sm text-gold-muted">#{i + 1}</span>
                      <RankBadge rank={m.rank} />
                      <span className="flex-1 font-medium">{m.name}</span>
                      <span className="text-sm font-bold text-gold">{m.score}<span className="text-muted-foreground text-xs">/{maxTotal}</span></span>
                    </div>
                  ))}
              </TabsContent>
              <TabsContent value="improved" className="space-y-2 mt-3">
                {leaderboard
                  .slice()
                  .sort((a, b) => b.improvement - a.improvement)
                  .slice(0, 10)
                  .map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-2.5">
                      <span className="w-6 text-center font-heading text-sm text-gold-muted">#{i + 1}</span>
                      <RankBadge rank={m.rank} />
                      <span className="flex-1 font-medium">{m.name}</span>
                      <span className={`text-sm font-bold ${m.improvement >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {m.improvement >= 0 ? "+" : ""}{m.improvement}
                      </span>
                    </div>
                  ))}
              </TabsContent>
              <TabsContent value="risk" className="space-y-2 mt-3">
                {leaderboard
                  .filter((m) => m.rank === "R1")
                  .sort((a, b) => a.score - b.score)
                  .slice(0, 10)
                  .map((m, i) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-secondary/40 p-2.5">
                      <span className="w-6 text-center font-heading text-sm text-gold-muted">#{i + 1}</span>
                      <RankBadge rank={m.rank} />
                      <span className="flex-1 font-medium">{m.name}</span>
                      <span className="text-sm font-bold text-rose-400">{m.score}<span className="text-muted-foreground text-xs">/{maxTotal}</span></span>
                    </div>
                  ))}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Per-member drilldown */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-heading text-gold">Member Drilldown</CardTitle>
              <CardDescription>History timeline for a single member</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Pick a member…" />
                </SelectTrigger>
                <SelectContent>
                  {members
                    .slice()
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={exportMember} disabled={!selectedMemberId}>
                <Download className="h-3.5 w-3.5 mr-2" />CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent style={{ height: 320 }}>
            {selectedMemberId && memberHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={memberHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="Score" stroke="hsl(45 90% 55%)" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="HQ" stroke="hsl(280 70% 65%)" strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="Kills (M)" stroke="hsl(0 60% 55%)" strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="Power" stroke="hsl(200 85% 60%)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                {selectedMemberId ? "No history yet for this member." : "Select a member to view history."}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
