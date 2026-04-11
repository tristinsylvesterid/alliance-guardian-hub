
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles: authenticated users can read all, update own
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'officer');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- user_roles: authenticated can read all, only admins can insert/update/delete
CREATE POLICY "Authenticated users can view roles"
  ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update existing table RLS: require authentication on all tables
-- Drop old open policies and replace with authenticated-only

-- members
DROP POLICY IF EXISTS "Allow all access to members" ON public.members;
CREATE POLICY "Authenticated access to members" ON public.members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- event_types
DROP POLICY IF EXISTS "Allow all access to event_types" ON public.event_types;
CREATE POLICY "Authenticated access to event_types" ON public.event_types FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- weekly_events
DROP POLICY IF EXISTS "Allow all access to weekly_events" ON public.weekly_events;
CREATE POLICY "Authenticated access to weekly_events" ON public.weekly_events FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- event_attendance
DROP POLICY IF EXISTS "Allow all access to event_attendance" ON public.event_attendance;
CREATE POLICY "Authenticated access to event_attendance" ON public.event_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- archived_members
DROP POLICY IF EXISTS "Allow all access to archived_members" ON public.archived_members;
CREATE POLICY "Authenticated access to archived_members" ON public.archived_members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- scoring_config: only admins can modify, all authenticated can read
DROP POLICY IF EXISTS "Allow all access to scoring_config" ON public.scoring_config;
CREATE POLICY "Authenticated can read scoring_config" ON public.scoring_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify scoring_config" ON public.scoring_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- svs_plans
DROP POLICY IF EXISTS "Allow all access to svs_plans" ON public.svs_plans;
CREATE POLICY "Authenticated access to svs_plans" ON public.svs_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- svs_plan_entries
DROP POLICY IF EXISTS "Allow all access to svs_plan_entries" ON public.svs_plan_entries;
CREATE POLICY "Authenticated access to svs_plan_entries" ON public.svs_plan_entries FOR ALL TO authenticated USING (true) WITH CHECK (true);
