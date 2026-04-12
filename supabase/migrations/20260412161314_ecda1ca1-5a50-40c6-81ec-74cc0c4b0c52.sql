-- Add numeric value column to event_attendance
ALTER TABLE public.event_attendance ADD COLUMN value numeric;

-- Add input_type to event_types ('status' = check/x, 'rank' = numeric rank input)
ALTER TABLE public.event_types ADD COLUMN input_type text NOT NULL DEFAULT 'status';

-- Update AvA event to use rank input type (if it exists)
UPDATE public.event_types SET input_type = 'rank' WHERE key = 'ava';