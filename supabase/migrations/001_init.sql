-- ShiftFix — written by IBM Bob
-- Postgres schema for employees, shifts, coverage, messages, audit.

create type employee_role as enum ('barista', 'cashier', 'manager');
create type shift_status as enum ('scheduled', 'needs_cover', 'covered', 'cancelled');
create type coverage_status as enum ('open', 'offering', 'pending_approval', 'filled', 'escalated');
create type offer_status as enum ('pending', 'accepted', 'declined', 'timed_out', 'skipped');
create type message_channel as enum ('group', 'dm');
create type audit_actor as enum ('agent', 'worker', 'manager');

create table employees (
  id text primary key,
  name text not null,
  roles employee_role[] not null,
  max_weekly_hours int not null default 40,
  is_manager boolean not null default false,
  is_bot boolean not null default false,
  last_pickup_at timestamptz
);

create table availability (
  id text primary key,
  employee_id text not null references employees(id),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_minute int not null,
  end_minute int not null
);

create table shifts (
  id text primary key,
  employee_id text not null references employees(id),
  role employee_role not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status shift_status not null default 'scheduled'
);

create table coverage_requests (
  id text primary key,
  shift_id text not null references shifts(id),
  reason text not null,
  status coverage_status not null,
  current_offer_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table offers (
  id text primary key,
  request_id text not null references coverage_requests(id),
  employee_id text not null references employees(id),
  rank int not null,
  status offer_status not null,
  sent_at timestamptz not null,
  answered_at timestamptz,
  expires_at timestamptz not null,
  skip_reason text
);

create table messages (
  id text primary key,
  channel message_channel not null,
  dm_peer_id text references employees(id),
  sender_id text not null references employees(id),
  text text not null,
  granite_intent text,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table audit_events (
  id text primary key,
  request_id text references coverage_requests(id),
  actor audit_actor not null,
  action text not null,
  reason text not null,
  timestamp timestamptz not null default now()
);

alter table coverage_requests
  add constraint coverage_requests_current_offer_fk
  foreign key (current_offer_id) references offers(id);
