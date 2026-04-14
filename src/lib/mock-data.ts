import { type Rank } from "./scoring";

export interface Member {
  id: string;
  name: string;
  leadershipRank?: "R4" | "R5";
  metrics: Record<string, number | boolean | string>;
  power: number;
  locationX: number;
  locationY: number;
  events: Record<string, boolean>;
  updatedAt?: string;
}

export interface ArchivedMember {
  id: string;
  name: string;
  leadershipRank?: string | null;
  metrics: Record<string, number | boolean | string>;
  reason: string;
  archivedAt: string;
  originalMemberId?: string | null;
}

export const EVENT_TYPES = [
  { key: "ava", name: "AvA" },
  { key: "svs", name: "SvS" },
  { key: "canyonClash", name: "Canyon Clash" },
];
