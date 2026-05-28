CREATE TABLE public.member_name_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  previous_name text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_name_history_member_id ON public.member_name_history(member_id);
CREATE INDEX idx_member_name_history_previous_name ON public.member_name_history(lower(previous_name));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_name_history TO authenticated;
GRANT ALL ON public.member_name_history TO service_role;

ALTER TABLE public.member_name_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authed can read member_name_history"
ON public.member_name_history FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Officers and admins can insert member_name_history"
ON public.member_name_history FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can update member_name_history"
ON public.member_name_history FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE POLICY "Officers and admins can delete member_name_history"
ON public.member_name_history FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'officer'::app_role));

CREATE OR REPLACE FUNCTION public.capture_member_name_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    INSERT INTO public.member_name_history (member_id, previous_name, changed_at)
    VALUES (OLD.id, OLD.name, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capture_member_name_change_trigger
AFTER UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.capture_member_name_change();