-- 1. Add point weight to event types
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS point_weight integer NOT NULL DEFAULT 1;

UPDATE public.event_types SET point_weight = 3 WHERE key = 'svs';
UPDATE public.event_types SET point_weight = 2 WHERE key = 'canyon_clash';

INSERT INTO public.event_types (key, name, has_svs_toggle, is_optional, input_type, point_weight)
VALUES
  ('ice_pit_1', 'Level 1 Ice Pit', false, true, 'status', 1),
  ('ice_pit_2', 'Level 2 Ice Pit', false, true, 'status', 2),
  ('ice_pit_3', 'Level 3 Ice Pit', false, true, 'status', 3),
  ('glory_war', 'Glory War',       false, true, 'status', 3)
ON CONFLICT (key) DO NOTHING;

-- 2. Weekly polls table
CREATE TABLE IF NOT EXISTS public.weekly_polls (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_event_id uuid NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_polls TO authenticated;
GRANT ALL ON public.weekly_polls TO service_role;

ALTER TABLE public.weekly_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read weekly_polls"
ON public.weekly_polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can insert weekly_polls"
ON public.weekly_polls FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update weekly_polls"
ON public.weekly_polls FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete weekly_polls"
ON public.weekly_polls FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE TRIGGER update_weekly_polls_updated_at
BEFORE UPDATE ON public.weekly_polls
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Poll responses table
CREATE TABLE IF NOT EXISTS public.poll_responses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL,
  member_id uuid NOT NULL,
  responded boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (poll_id, member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_responses TO authenticated;
GRANT ALL ON public.poll_responses TO service_role;

ALTER TABLE public.poll_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read poll_responses"
ON public.poll_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can insert poll_responses"
ON public.poll_responses FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update poll_responses"
ON public.poll_responses FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete poll_responses"
ON public.poll_responses FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE TRIGGER update_poll_responses_updated_at
BEFORE UPDATE ON public.poll_responses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Seed Weekly Participation Avg ranking metric (use 'number' type per existing constraint)
INSERT INTO public.scoring_config (key, name, type, unit, brackets, max_points, sort_order)
VALUES (
  'weeklyParticipationAvg',
  'Weekly Participation Avg',
  'number',
  '%',
  '[
    {"label":"90%+","points":5,"min":90,"max":100},
    {"label":"75-89%","points":3,"min":75,"max":89},
    {"label":"50-74%","points":1,"min":50,"max":74},
    {"label":"<50%","points":0,"min":0,"max":49}
  ]'::jsonb,
  5,
  100
)
ON CONFLICT (key) DO NOTHING;