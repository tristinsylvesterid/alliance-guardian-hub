-- Add percent-based columns to rank_thresholds
ALTER TABLE public.rank_thresholds
  ADD COLUMN IF NOT EXISTS min_percent NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS max_percent NUMERIC(5,2);

-- Backfill / seed defaults: R1 0-49.99, R2 50-84.99, R3 85-100
UPDATE public.rank_thresholds SET min_percent = 0,  max_percent = 49.99 WHERE rank_key = 'R1';
UPDATE public.rank_thresholds SET min_percent = 50, max_percent = 84.99 WHERE rank_key = 'R2';
UPDATE public.rank_thresholds SET min_percent = 85, max_percent = NULL  WHERE rank_key = 'R3';

-- Drop legacy absolute-point columns
ALTER TABLE public.rank_thresholds
  DROP COLUMN IF EXISTS min_points,
  DROP COLUMN IF EXISTS max_points;

-- Enforce NOT NULL on min_percent now that data is backfilled
ALTER TABLE public.rank_thresholds
  ALTER COLUMN min_percent SET NOT NULL;