
CREATE TABLE public.rank_thresholds (
  rank_key text PRIMARY KEY,
  min_points integer NOT NULL,
  max_points integer
);

ALTER TABLE public.rank_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read rank_thresholds"
ON public.rank_thresholds FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can modify rank_thresholds"
ON public.rank_thresholds FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.rank_thresholds (rank_key, min_points, max_points)
VALUES ('R1', 0, 14), ('R2', 15, 25), ('R3', 26, NULL);
