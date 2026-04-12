
-- Drop old permissive policies and replace with role-based ones

-- MEMBERS
DROP POLICY IF EXISTS "Authenticated access to members" ON public.members;
CREATE POLICY "Anyone authed can read members" ON public.members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify members" ON public.members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update members" ON public.members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete members" ON public.members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));

-- EVENT_ATTENDANCE
DROP POLICY IF EXISTS "Authenticated access to event_attendance" ON public.event_attendance;
CREATE POLICY "Anyone authed can read event_attendance" ON public.event_attendance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify event_attendance" ON public.event_attendance FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update event_attendance" ON public.event_attendance FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete event_attendance" ON public.event_attendance FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));

-- EVENT_TYPES
DROP POLICY IF EXISTS "Authenticated access to event_types" ON public.event_types;
CREATE POLICY "Anyone authed can read event_types" ON public.event_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify event_types" ON public.event_types FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update event_types" ON public.event_types FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete event_types" ON public.event_types FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- WEEKLY_EVENTS
DROP POLICY IF EXISTS "Authenticated access to weekly_events" ON public.weekly_events;
CREATE POLICY "Anyone authed can read weekly_events" ON public.weekly_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify weekly_events" ON public.weekly_events FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update weekly_events" ON public.weekly_events FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete weekly_events" ON public.weekly_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));

-- ARCHIVED_MEMBERS
DROP POLICY IF EXISTS "Authenticated access to archived_members" ON public.archived_members;
CREATE POLICY "Anyone authed can read archived_members" ON public.archived_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify archived_members" ON public.archived_members FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update archived_members" ON public.archived_members FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete archived_members" ON public.archived_members FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));

-- SVS_PLANS
DROP POLICY IF EXISTS "Authenticated access to svs_plans" ON public.svs_plans;
CREATE POLICY "Anyone authed can read svs_plans" ON public.svs_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify svs_plans" ON public.svs_plans FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update svs_plans" ON public.svs_plans FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete svs_plans" ON public.svs_plans FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));

-- SVS_PLAN_ENTRIES
DROP POLICY IF EXISTS "Authenticated access to svs_plan_entries" ON public.svs_plan_entries;
CREATE POLICY "Anyone authed can read svs_plan_entries" ON public.svs_plan_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Officers and admins can modify svs_plan_entries" ON public.svs_plan_entries FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can update svs_plan_entries" ON public.svs_plan_entries FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
CREATE POLICY "Officers and admins can delete svs_plan_entries" ON public.svs_plan_entries FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'officer'::app_role));
