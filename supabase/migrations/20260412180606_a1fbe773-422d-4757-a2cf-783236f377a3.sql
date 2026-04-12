ALTER TABLE public.svs_plan_entries ADD COLUMN has_t10s boolean NOT NULL DEFAULT false;
ALTER TABLE public.svs_plan_entries ALTER COLUMN team SET DEFAULT 'team4';