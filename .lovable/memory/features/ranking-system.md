---
name: Ranking System
description: Weighted point system with tiered brackets per metric, class-based ranks (R1-R5), editable thresholds stored in DB
type: feature
---
## Rank Classes
- R1: ≤14 total points (default, editable via Settings)
- R2: 15-25 total points (default, editable via Settings)
- R3: 26+ total points (default, editable via Settings)
- R4: Officer (leadership override, score doesn't matter)
- R5: Leader (leadership override, score doesn't matter)

## Rank Thresholds
Stored in `rank_thresholds` table (rank_key, min_points, max_points). Editable from Settings page. `getRank()` in scoring.ts accepts optional thresholds parameter with fallback to hardcoded defaults.

## Scoring Brackets (11 metrics, max 31 total)
1. HQ Level: 30+=3, 28-29=2, ≤27=0
2. Troops: T10=3, T9=2, T8/lower=0
3. Rally Cap: 10=3, 9=2, ≤8=0
4. Alliance Recognition Research: 100%=2, ≥70%=1, <70%=0
5. AvA Weekly Score (rank): top30=4, 31-50=3, 51-70=1, 71+=0
6. PC Heroes: >50=3, 40-50=2, 30-39=1, <30=0
7. Tech Power: >15M=3, 12-15M=2, 10-11.99M=1, <10M=0
8. Vehicle Power: >8M=3, 7-8M=2, 6-7M=1, <6M=0
9. SvS Participation: yes=3, no=0
10. Kill Count: >1.5M=3, 1-1.5M=1, <1M=0
11. Engagement: yes=1, no=0

## Events Tracked
AvA, SvS, Canyon Clash (expandable)
