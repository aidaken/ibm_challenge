-- Durable demo snapshot (atomic whole-state writes for serverless) + AI metadata columns.

create table if not exists demo_snapshots (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table messages
  add column if not exists ai_provider text,
  add column if not exists ai_model_id text,
  add column if not exists ai_latency_ms numeric;

alter table audit_events
  add column if not exists ai_provider text,
  add column if not exists ai_model_id text,
  add column if not exists ai_latency_ms numeric;
