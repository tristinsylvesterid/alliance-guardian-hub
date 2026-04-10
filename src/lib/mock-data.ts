import { type Rank } from "./scoring";

export interface Member {
  id: string;
  name: string;
  leadershipRank?: "R4" | "R5";
  metrics: Record<string, number | boolean | string>;
  events: Record<string, boolean>;
}

export const EVENT_TYPES = [
  { key: "ava", name: "AvA" },
  { key: "svs", name: "SvS" },
  { key: "canyonClash", name: "Canyon Clash" },
];

const names = [
  "ShadowReaper", "IronValkyrie", "NightWolf", "StormBringer", "PhoenixRise",
  "DeathDealer", "CrimsonBlade", "ThunderStrike", "FrostBite", "SilverArrow",
  "DarkKnight", "BlazeFury", "VenomStrike", "WarHammer", "SteelNerve",
  "GhostRider", "DragonSlayer", "ViperFang", "AcidRain", "BulletProof",
];

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateMember(name: string, index: number): Member {
  const isLeader = index === 0;
  const isOfficer = index >= 1 && index <= 4;

  return {
    id: `member-${index}`,
    name,
    leadershipRank: isLeader ? "R5" : isOfficer ? "R4" : undefined,
    metrics: {
      hqLevel: randomBetween(25, 31),
      troops: ["T8", "T9", "T10"][randomBetween(0, 2)],
      rallyCap: randomBetween(7, 10),
      allianceRecognition: randomBetween(40, 100),
      avaWeeklyScore: randomBetween(1, 90),
      pcHeroes: randomBetween(20, 60),
      techPower: randomBetween(7, 18),
      vehiclePower: randomBetween(4, 10),
      svsParticipation: Math.random() > 0.3,
      killCount: parseFloat((Math.random() * 2.5).toFixed(2)),
      engagement: Math.random() > 0.2,
    },
    events: {
      ava: Math.random() > 0.3,
      svs: Math.random() > 0.4,
      canyonClash: Math.random() > 0.5,
    },
  };
}

export const MOCK_MEMBERS: Member[] = names.map((name, i) => generateMember(name, i));
