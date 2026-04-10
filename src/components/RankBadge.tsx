import { type Rank, getRankBgColor } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function RankBadge({ rank, className }: { rank: Rank; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-0.5 font-heading text-xs font-bold tracking-wider text-white",
        getRankBgColor(rank),
        className
      )}
    >
      {rank}
    </span>
  );
}
