-- Fake cafe seed: Amanda, Arlo, Maya, David, Chris, Jordan, Sam (manager), ShiftFix bot.

insert into employees (id, name, roles, max_weekly_hours, is_manager, is_bot, last_pickup_at) values
  ('emp_amanda',  'Amanda',   array['barista']::employee_role[],  40, false, false, null),
  ('emp_arlo',    'Arlo',     array['barista']::employee_role[],  40, false, false, null),
  ('emp_maya',    'Maya',     array['barista']::employee_role[],  40, false, false, null),
  ('emp_david',   'David',    array['barista']::employee_role[],  40, false, false, null),
  ('emp_chris',   'Chris',    array['barista']::employee_role[],  40, false, false, null),
  ('emp_jordan',  'Jordan',   array['cashier']::employee_role[],  40, false, false, '2026-11-10T12:00:00Z'),
  ('emp_manager', 'Sam',      array['manager']::employee_role[],  60, true,  false, null),
  ('emp_shiftfix','ShiftFix', array['manager']::employee_role[],  0,  false, true,  null);

insert into availability (id, employee_id, day_of_week, start_minute, end_minute) values
  ('av_amanda_mon', 'emp_amanda', 1, 600,  1080),  -- 10am-6pm
  ('av_arlo_mon',   'emp_arlo',   1, 840,  1200),  -- 2pm-8pm
  ('av_maya_mon',   'emp_maya',   1, 540,  840),   -- 9am-2pm
  ('av_david_mon',  'emp_david',  1, 840,  1080),  -- 2pm-6pm
  ('av_chris_mon',  'emp_chris',  1, 0,    1440),  -- all day
  ('av_jordan_mon', 'emp_jordan', 1, 540,  900);   -- 9am-3pm

insert into shifts (id, employee_id, role, start_at, end_at, status) values
  ('shift_amanda_mon',  'emp_amanda', 'barista', '2026-11-16T10:00:00Z', '2026-11-16T18:00:00Z', 'scheduled'),
  ('shift_jordan_mon',  'emp_jordan', 'cashier', '2026-11-16T09:00:00Z', '2026-11-16T15:00:00Z', 'scheduled'),
  -- Chris's 38h in the same week (Tue-Sat Nov 17-21)
  ('shift_chris_tue',   'emp_chris',  'barista', '2026-11-17T09:00:00Z', '2026-11-17T17:00:00Z', 'scheduled'),
  ('shift_chris_wed',   'emp_chris',  'barista', '2026-11-18T09:00:00Z', '2026-11-18T17:00:00Z', 'scheduled'),
  ('shift_chris_thu',   'emp_chris',  'barista', '2026-11-19T09:00:00Z', '2026-11-19T17:00:00Z', 'scheduled'),
  ('shift_chris_fri',   'emp_chris',  'barista', '2026-11-20T09:00:00Z', '2026-11-20T16:00:00Z', 'scheduled'),
  ('shift_chris_sat',   'emp_chris',  'barista', '2026-11-21T10:00:00Z', '2026-11-21T17:00:00Z', 'scheduled');

insert into messages (id, channel, dm_peer_id, sender_id, text, created_at) values
  ('msg_welcome', 'group', null, 'emp_shiftfix', 'ShiftFix is online. Post a call-out here and I''ll find cover.', '2026-11-16T07:30:00Z');
