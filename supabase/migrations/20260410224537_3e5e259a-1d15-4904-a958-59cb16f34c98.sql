
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1. members
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  leadership_rank TEXT CHECK (leadership_rank IN ('R4', 'R5')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  location_x NUMERIC NOT NULL DEFAULT 0,
  location_y NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to members" ON public.members FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_members_updated_at BEFORE UPDATE ON public.members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. event_types
CREATE TABLE public.event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  has_svs_toggle BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to event_types" ON public.event_types FOR ALL USING (true) WITH CHECK (true);

-- 3. weekly_events
CREATE TABLE public.weekly_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  week_id TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  svs_active BOOLEAN NOT NULL DEFAULT true,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.weekly_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to weekly_events" ON public.weekly_events FOR ALL USING (true) WITH CHECK (true);

-- 4. event_attendance
CREATE TABLE public.event_attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  weekly_event_id UUID NOT NULL REFERENCES public.weekly_events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  event_type_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'x' CHECK (status IN ('check', 'x', 'na')),
  UNIQUE(weekly_event_id, member_id, event_type_key)
);
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to event_attendance" ON public.event_attendance FOR ALL USING (true) WITH CHECK (true);

-- 5. archived_members
CREATE TABLE public.archived_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_member_id UUID,
  name TEXT NOT NULL,
  leadership_rank TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  reason TEXT NOT NULL DEFAULT 'No reason provided',
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.archived_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to archived_members" ON public.archived_members FOR ALL USING (true) WITH CHECK (true);

-- 6. scoring_config
CREATE TABLE public.scoring_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('number', 'boolean', 'tier', 'rank')),
  unit TEXT,
  max_points INTEGER NOT NULL DEFAULT 0,
  brackets JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scoring_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to scoring_config" ON public.scoring_config FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_scoring_config_updated_at BEFORE UPDATE ON public.scoring_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. svs_plans
CREATE TABLE public.svs_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT '' CHECK (mode IN ('invading', 'defending', '')),
  opponent_server TEXT NOT NULL DEFAULT '',
  svs_week TEXT NOT NULL DEFAULT '' CHECK (svs_week IN ('1', '2', '')),
  result TEXT NOT NULL DEFAULT '' CHECK (result IN ('win', 'lose', '')),
  capital_percentage NUMERIC NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.svs_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to svs_plans" ON public.svs_plans FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER update_svs_plans_updated_at BEFORE UPDATE ON public.svs_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. svs_plan_entries
CREATE TABLE public.svs_plan_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.svs_plans(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  power NUMERIC NOT NULL DEFAULT 0,
  poll_response TEXT NOT NULL DEFAULT '' CHECK (poll_response IN ('yes', 'no', '')),
  team TEXT NOT NULL DEFAULT 'team1' CHECK (team IN ('team1', 'team2', 'team3', 'team4', 'fighting_elsewhere')),
  role TEXT NOT NULL DEFAULT 'fighter' CHECK (role IN ('fighter', 'deputy', 'commander', 'intel_officer')),
  location_x NUMERIC NOT NULL DEFAULT 0,
  location_y NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(plan_id, member_id)
);
ALTER TABLE public.svs_plan_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to svs_plan_entries" ON public.svs_plan_entries FOR ALL USING (true) WITH CHECK (true);
