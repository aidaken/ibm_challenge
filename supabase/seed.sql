-- ShiftFix — written by IBM Bob
-- Fake cafe seed (Amanda, Arlo, Jordan, Manager, ShiftFix).

insert into employees (id, name, roles, max_weekly_hours, is_manager, is_bot, last_pickup_at) values
  ('emp_amanda', 'Amanda', array['barista']::employee_role[], 40, false, false, null),
  ('emp_arlo', 'Arlo', array['barista']::employee_role[], 40, false, false, null),
  ('emp_jordan', 'Jordan', array['cashier']::employee_role[], 40, false, false, '2026-11-10T12:00:00Z'),
  ('emp_manager', 'Manager', array['manager']::employee_role[], 60, true, false, null),
  ('emp_shiftfix', 'ShiftFix', array['manager']::employee_role[], 0, false, true, null);

insert into availability (id, employee_id, day_of_week, start_minute, end_minute) values
  ('av_amanda_mon', 'emp_amanda', 1, 660, 1020),
  ('av_arlo_mon', 'emp_arlo', 1, 0, 1440),
  ('av_jordan_mon', 'emp_jordan', 1, 540, 900);

insert into shifts (id, employee_id, role, start_at, end_at, status) values
  ('shift_amanda_mon', 'emp_amanda', 'barista', '2026-11-16T11:00:00Z', '2026-11-16T17:00:00Z', 'scheduled'),
  ('shift_jordan_mon', 'emp_jordan', 'cashier', '2026-11-16T09:00:00Z', '2026-11-16T15:00:00Z', 'scheduled');

insert into messages (id, channel, dm_peer_id, sender_id, text, created_at) values
  ('msg_welcome', 'group', null, 'emp_shiftfix', 'ShiftFix is online. Post a call-out here and I''ll find cover.', '2026-11-16T07:30:00Z');
