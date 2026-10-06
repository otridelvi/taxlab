-- =============================================================================
-- Taxlab · Migration 0001 · Admin core
-- Tables needed for admin login and the dashboard (PLAN-01).
-- Participant data tables (responses, events, contacts, archived_sessions)
-- are added in a later migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.admin_role as enum ('admin', 'assistant', 'viewer');

create type public.participant_status as enum (
  'not_started',
  'in_progress',
  'completed',
  'timed_out',
  'cancelled'
);

create type public.assignment_mode as enum ('random', 'manual');

-- ---------------------------------------------------------------------------
-- admins: one row per admin account (linked to Supabase Auth users)
-- ---------------------------------------------------------------------------
create table public.admins (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  role        public.admin_role not null default 'assistant',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- settings: simple key/value configuration
-- ---------------------------------------------------------------------------
create table public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  uuid references public.admins (id) on delete set null,
  updated_at  timestamptz not null default now()
);

insert into public.settings (key, value) values
  ('target_per_cell', '30'::jsonb),
  ('imbalance_threshold', '0.20'::jsonb),
  ('imbalance_min_avg', '5'::jsonb);

-- ---------------------------------------------------------------------------
-- batches: one row per "generate participants" action
-- ---------------------------------------------------------------------------
create table public.batches (
  id           uuid primary key default gen_random_uuid(),
  label        text check (label is null or length(label) <= 60),
  mode         public.assignment_mode not null,
  manual_cell  smallint check (manual_cell between 1 and 4),
  quantity     integer not null check (quantity between 1 and 200),
  created_by   uuid not null references public.admins (id),
  created_at   timestamptz not null default now(),
  constraint batches_manual_cell_matches_mode
    check ((mode = 'manual') = (manual_cell is not null))
);

-- ---------------------------------------------------------------------------
-- participants: one row per access code
-- ---------------------------------------------------------------------------
create table public.participants (
  id               uuid primary key default gen_random_uuid(),
  access_code      text not null unique
                     check (access_code ~ '^TX-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$'),
  cell             smallint not null check (cell between 1 and 4),
  batch_id         uuid not null references public.batches (id),
  status           public.participant_status not null default 'not_started',
  consent_at       timestamptz,
  started_at       timestamptz,
  task_deadline    timestamptz,
  finished_at      timestamptz,
  current_page     text,
  case_order       jsonb,
  content_version  text,
  created_at       timestamptz not null default now()
);

create index participants_cell_status_idx on public.participants (cell, status);
create index participants_batch_idx on public.participants (batch_id);

-- ---------------------------------------------------------------------------
-- audit_logs: append-only record of admin actions
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  admin_id        uuid references public.admins (id) on delete set null,
  action          text not null,
  participant_id  uuid references public.participants (id) on delete set null,
  detail          jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

create function public.prevent_audit_log_changes()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs is append-only';
end;
$$;

create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function public.prevent_audit_log_changes();

-- ---------------------------------------------------------------------------
-- login_attempts: used for the admin login rate limit
-- ---------------------------------------------------------------------------
create table public.login_attempts (
  id          bigint generated always as identity primary key,
  email       text not null,
  success     boolean not null,
  ip          text,
  created_at  timestamptz not null default now()
);

create index login_attempts_email_created_idx
  on public.login_attempts (email, created_at desc);

-- ---------------------------------------------------------------------------
-- v_cell_summary: participant counts per cell (always returns cells 1–4)
-- ---------------------------------------------------------------------------
create view public.v_cell_summary
with (security_invoker = true)
as
select
  c.cell::smallint                                                  as cell,
  count(p.id)::integer                                              as total,
  count(p.id) filter (where p.status = 'not_started')::integer      as not_started,
  count(p.id) filter (where p.status = 'in_progress')::integer      as in_progress,
  count(p.id) filter (where p.status = 'completed')::integer        as completed,
  count(p.id) filter (where p.status = 'timed_out')::integer        as timed_out,
  count(p.id) filter (where p.status = 'cancelled')::integer        as cancelled
from generate_series(1, 4) as c (cell)
left join public.participants p on p.cell = c.cell
group by c.cell
order by c.cell;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- All access goes through the server with the service role key.
-- RLS is enabled with NO policies, so the anon/authenticated roles
-- cannot read or write anything directly.
-- ---------------------------------------------------------------------------
alter table public.admins          enable row level security;
alter table public.settings        enable row level security;
alter table public.batches         enable row level security;
alter table public.participants    enable row level security;
alter table public.audit_logs      enable row level security;
alter table public.login_attempts  enable row level security;

revoke all on public.v_cell_summary from anon, authenticated;
