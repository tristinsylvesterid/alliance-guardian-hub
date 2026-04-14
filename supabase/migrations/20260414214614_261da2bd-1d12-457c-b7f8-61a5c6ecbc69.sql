-- Delete attendance data for future weeks
DELETE FROM public.event_attendance WHERE weekly_event_id IN (
  '8967d1c5-0fe5-41ec-a4df-235033cfb45f',
  '863d5680-92c9-4cd5-a19d-6183ff50dae0',
  'e3075283-43c3-44b0-951f-531fd8b63917'
);

-- Delete the future weekly_events rows
DELETE FROM public.weekly_events WHERE id IN (
  '8967d1c5-0fe5-41ec-a4df-235033cfb45f',
  '863d5680-92c9-4cd5-a19d-6183ff50dae0',
  'e3075283-43c3-44b0-951f-531fd8b63917'
);