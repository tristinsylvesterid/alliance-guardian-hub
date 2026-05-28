-- Add is_optional flag to event_types
ALTER TABLE public.event_types
ADD COLUMN IF NOT EXISTS is_optional boolean NOT NULL DEFAULT false;

-- Per-week toggle table for optional events
CREATE TABLE IF NOT EXISTS public.weekly_event_toggles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_event_id uuid NOT NULL,
  event_type_key text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (weekly_event_id, event_type_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_event_toggles TO authenticated;
GRANT ALL ON public.weekly_event_toggles TO service_role;

ALTER TABLE public.weekly_event_toggles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read weekly_event_toggles"
ON public.weekly_event_toggles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Officers and admins can insert weekly_event_toggles"
ON public.weekly_event_toggles FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can update weekly_event_toggles"
ON public.weekly_event_toggles FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can delete weekly_event_toggles"
ON public.weekly_event_toggles FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE TRIGGER update_weekly_event_toggles_updated_at
BEFORE UPDATE ON public.weekly_event_toggles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Mark SVS as optional so it shows in the generic UI alongside its legacy toggle
UPDATE public.event_types SET is_optional = true WHERE has_svs_toggle = true;