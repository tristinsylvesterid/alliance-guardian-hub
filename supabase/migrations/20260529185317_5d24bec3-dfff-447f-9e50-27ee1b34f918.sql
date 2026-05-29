
CREATE TABLE public.member_metrics_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  power numeric NOT NULL DEFAULT 0,
  leadership_rank text,
  total_score integer NOT NULL DEFAULT 0,
  rank text,
  source text NOT NULL DEFAULT 'edit',
  week_id text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  CONSTRAINT member_metrics_history_member_date_unique UNIQUE (member_id, recorded_date)
);

CREATE INDEX idx_mmh_member_recorded_at ON public.member_metrics_history (member_id, recorded_at DESC);
CREATE INDEX idx_mmh_week ON public.member_metrics_history (week_id);
CREATE INDEX idx_mmh_recorded_date ON public.member_metrics_history (recorded_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_metrics_history TO authenticated;
GRANT ALL ON public.member_metrics_history TO service_role;

ALTER TABLE public.member_metrics_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read member_metrics_history"
ON public.member_metrics_history FOR SELECT TO authenticated USING (true);

CREATE POLICY "Officers and admins can insert member_metrics_history"
ON public.member_metrics_history FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can update member_metrics_history"
ON public.member_metrics_history FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can delete member_metrics_history"
ON public.member_metrics_history FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));
