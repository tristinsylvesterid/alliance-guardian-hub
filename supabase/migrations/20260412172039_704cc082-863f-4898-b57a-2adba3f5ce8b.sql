
-- 1. Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_display_name text NOT NULL DEFAULT 'System',
  table_name text NOT NULL,
  action text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Admin-only read
CREATE POLICY "Admins can read audit_log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No insert/update/delete via API
-- Trigger function writes with SECURITY DEFINER

-- 2. Trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _display_name text;
  _record_id text;
BEGIN
  _user_id := auth.uid();

  SELECT display_name INTO _display_name
  FROM public.profiles WHERE user_id = _user_id;

  IF _display_name IS NULL THEN
    _display_name := 'System';
  END IF;

  IF TG_OP = 'DELETE' THEN
    _record_id := OLD.id::text;
  ELSE
    _record_id := NEW.id::text;
  END IF;

  INSERT INTO public.audit_log (user_id, user_display_name, table_name, action, record_id, old_data, new_data)
  VALUES (
    _user_id,
    _display_name,
    TG_TABLE_NAME,
    TG_OP,
    _record_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Attach triggers to all tracked tables
CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.members FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.event_attendance FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.weekly_events FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.archived_members FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.svs_plans FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.svs_plan_entries FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.scoring_config FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();

CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE
  ON public.event_types FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
