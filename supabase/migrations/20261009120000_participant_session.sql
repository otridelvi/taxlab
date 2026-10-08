-- =============================================================================
-- Taxlab · Migration 0003 · Participant session (PLAN-03)
-- - Session, timer and flow columns on participants (FSD-Participant §5, §6, §12)
-- - responses, events, contacts, code_attempts
-- - Settings: flow_version, timer_minutes, timer_warning_minutes, timer_on_expire
-- - Atomic functions: participant_login, save_responses, advance_step,
--   finish_session, close_stale_sessions (service role only)
-- The "next step" is computed in TypeScript from content/flow.ts and passed in
-- as parameters; these functions check session + current page under a row lock.
-- =============================================================================

alter table public.participants
  add column session_id        uuid,
  add column flow_version      text check (flow_version in ('A', 'B')),
  add column task_started_at   timestamptz,
  add column task_end_at       timestamptz,
  add column timed_out         boolean not null default false,
  add column timed_out_at_page text,
  add column last_seen_at      timestamptz;

-- ---------------------------------------------------------------------------
-- responses: one row per participant per item (latest value)
-- ---------------------------------------------------------------------------
create table public.responses (
  participant_id  uuid not null references public.participants (id) on delete cascade,
  item_key        text not null check (item_key ~ '^[a-z0-9_]{1,40}$'),
  value           jsonb not null,
  updated_at      timestamptz not null default now(),
  primary key (participant_id, item_key)
);

-- ---------------------------------------------------------------------------
-- events: raw behaviour log. Browser events carry a per-session seq;
-- server events have seq = null and source = 'server'.
-- ---------------------------------------------------------------------------
create table public.events (
  id              bigint generated always as identity primary key,
  participant_id  uuid not null references public.participants (id) on delete cascade,
  session_id      uuid not null,
  seq             integer,
  source          text not null default 'client' check (source in ('client', 'server')),
  type            text not null check (length(type) between 1 and 40),
  target          text check (target is null or length(target) <= 60),
  round           smallint check (round in (1, 2)),
  page_id         text,
  client_ts       timestamptz not null,
  received_at     timestamptz not null default now(),
  duration_ms     integer,
  meta            jsonb,
  unique (participant_id, session_id, seq)
);

create index events_participant_idx on public.events (participant_id, client_ts);

-- ---------------------------------------------------------------------------
-- contacts: identity / incentive data, kept apart from responses
-- ---------------------------------------------------------------------------
create table public.contacts (
  participant_id  uuid primary key references public.participants (id) on delete cascade,
  name            text check (name is null or length(name) <= 120),
  email           text check (email is null or length(email) <= 254),
  ewallet         text check (ewallet is null or length(ewallet) <= 20),
  phone           text check (phone is null or length(phone) <= 20),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- code_attempts: participant login rate limit (per device and per IP)
-- ---------------------------------------------------------------------------
create table public.code_attempts (
  id          bigint generated always as identity primary key,
  device_id   text,
  ip          text,
  success     boolean not null,
  created_at  timestamptz not null default now()
);

create index code_attempts_device_idx on public.code_attempts (device_id, created_at desc);
create index code_attempts_ip_idx on public.code_attempts (ip, created_at desc);

alter table public.responses     enable row level security;
alter table public.events        enable row level security;
alter table public.contacts      enable row level security;
alter table public.code_attempts enable row level security;

insert into public.settings (key, value) values
  ('flow_version', '"A"'::jsonb),
  ('timer_minutes', '40'::jsonb),
  ('timer_warning_minutes', '5'::jsonb),
  ('timer_on_expire', '"to_questionnaire"'::jsonb)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Internal helpers, used by the functions below (service role only)
-- ---------------------------------------------------------------------------
create function public._p_event(
  p_participant_id uuid,
  p_session_id     uuid,
  p_type           text,
  p_target         text default null,
  p_round          smallint default null,
  p_page_id        text default null,
  p_ts             timestamptz default now()
)
returns void
language sql
set search_path = public
as $$
  insert into events (participant_id, session_id, source, type, target, round, page_id, client_ts)
  values (p_participant_id, p_session_id, 'server', p_type, p_target, p_round, p_page_id, p_ts);
$$;

-- p_items: { item_key: value }; p_contact: { name?, email?, ewallet?, phone? }
create function public._p_write_items(
  p_participant_id uuid,
  p_items          jsonb,
  p_contact        jsonb
)
returns void
language plpgsql
set search_path = public
as $$
begin
  if p_items is not null and jsonb_typeof(p_items) = 'object' and p_items <> '{}'::jsonb then
    insert into responses (participant_id, item_key, value, updated_at)
    select p_participant_id, i.key, i.value, now()
    from jsonb_each(p_items) as i (key, value)
    on conflict (participant_id, item_key)
    do update set value = excluded.value, updated_at = excluded.updated_at;
  end if;

  if p_contact is not null and jsonb_typeof(p_contact) = 'object' and p_contact <> '{}'::jsonb then
    insert into contacts (participant_id) values (p_participant_id)
    on conflict (participant_id) do nothing;
    update contacts set
      name    = case when p_contact ? 'name'    then nullif(p_contact ->> 'name', '')    else name end,
      email   = case when p_contact ? 'email'   then nullif(p_contact ->> 'email', '')   else email end,
      ewallet = case when p_contact ? 'ewallet' then nullif(p_contact ->> 'ewallet', '') else ewallet end,
      phone   = case when p_contact ? 'phone'   then nullif(p_contact ->> 'phone', '')   else phone end,
      updated_at = now()
    where participant_id = p_participant_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- participant_login → result:
--   'started' | 'resumed' | 'not_found' | 'cancelled' | 'completed' | 'closed'
--   | 'consent_required'
-- A new session id always replaces the previous one (single active session).
-- ---------------------------------------------------------------------------
create function public.participant_login(
  p_code            text,
  p_session_id      uuid,
  p_consent_at      timestamptz,
  p_flow_version    text,
  p_content_version text,
  p_first_page      text
)
returns table (out_result text, out_participant_id uuid, out_page text)
language plpgsql
set search_path = public
as $$
declare
  v participants%rowtype;
begin
  select * into v from participants where access_code = p_code for update;
  if not found then
    return query select 'not_found'::text, null::uuid, null::text;
    return;
  end if;

  if v.status = 'cancelled' then
    return query select 'cancelled'::text, null::uuid, null::text;
    return;
  elsif v.status = 'completed' then
    return query select 'completed'::text, null::uuid, null::text;
    return;
  elsif v.status = 'timed_out' then
    return query select 'closed'::text, null::uuid, null::text;
    return;
  end if;

  if v.status = 'not_started' then
    if p_consent_at is null then
      return query select 'consent_required'::text, null::uuid, null::text;
      return;
    end if;
    update participants set
      status          = 'in_progress',
      consent_at      = p_consent_at,
      started_at      = now(),
      flow_version    = p_flow_version,
      content_version = p_content_version,
      current_page    = p_first_page,
      current_round   = null,
      session_id      = p_session_id,
      last_seen_at    = now()
    where id = v.id;
    perform _p_event(v.id, p_session_id, 'consent', null, null, 'consent', p_consent_at);
    perform _p_event(v.id, p_session_id, 'session_start', null, null, p_first_page);
    return query select 'started'::text, v.id, p_first_page;
    return;
  end if;

  -- in_progress: resume on this device, ending any other session
  update participants set session_id = p_session_id, last_seen_at = now() where id = v.id;
  perform _p_event(v.id, p_session_id, 'session_resume', null, v.current_round, v.current_page);
  return query select 'resumed'::text, v.id, v.current_page;
end;
$$;

-- ---------------------------------------------------------------------------
-- save_responses (autosave) → 'ok' | 'not_active' | 'session_replaced' | 'stale_page'
-- ---------------------------------------------------------------------------
create function public.save_responses(
  p_participant_id uuid,
  p_session_id     uuid,
  p_page           text,
  p_items          jsonb,
  p_contact        jsonb
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v participants%rowtype;
begin
  select * into v from participants where id = p_participant_id for update;
  if not found or v.status <> 'in_progress' then
    return 'not_active';
  end if;
  if v.session_id is distinct from p_session_id then
    return 'session_replaced';
  end if;
  if v.current_page is distinct from p_page then
    return 'stale_page';
  end if;

  perform _p_write_items(p_participant_id, p_items, p_contact);
  update participants set last_seen_at = now() where id = p_participant_id;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- advance_step → 'ok' | 'not_active' | 'session_replaced' | 'stale_page'
--               | 'expired' | 'not_expired'
-- p_reason 'next': saves items, moves to p_next_page (validated by the caller).
-- p_reason 'timer_expired': only once the deadline has passed; saves items as
--   they are, flags timed_out and moves to p_next_page (the 'time_up' step).
-- ---------------------------------------------------------------------------
create function public.advance_step(
  p_participant_id uuid,
  p_session_id     uuid,
  p_from           text,
  p_items          jsonb,
  p_contact        jsonb,
  p_reason         text,
  p_next_page      text,
  p_next_round     smallint,
  p_timer_start    boolean,
  p_timer_end      boolean,
  p_timer_minutes  integer
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v participants%rowtype;
  v_running boolean;
begin
  select * into v from participants where id = p_participant_id for update;
  if not found or v.status <> 'in_progress' then
    return 'not_active';
  end if;
  if v.session_id is distinct from p_session_id then
    return 'session_replaced';
  end if;
  if v.current_page is distinct from p_from then
    return 'stale_page';
  end if;

  v_running := v.task_deadline is not null and v.task_end_at is null;

  if p_reason = 'timer_expired' then
    if not v_running or now() < v.task_deadline - interval '2 seconds' then
      return 'not_expired';
    end if;
    perform _p_write_items(p_participant_id, p_items, p_contact);
    update participants set
      timed_out         = true,
      timed_out_at_page = v.current_page,
      task_end_at       = v.task_deadline,
      current_page      = p_next_page,
      current_round     = null,
      last_seen_at      = now()
    where id = p_participant_id;
    perform _p_event(p_participant_id, p_session_id, 'timer_expired', null, v.current_round, v.current_page);
    perform _p_event(p_participant_id, p_session_id, 'page_leave', v.current_page, v.current_round, v.current_page);
    if v.current_round is not null then
      perform _p_event(p_participant_id, p_session_id, 'round_end', v.current_round::text, v.current_round, v.current_page);
    end if;
    return 'ok';
  end if;

  -- Normal "Next": not allowed once the time is up (30 s grace for slow networks).
  if v_running and now() > v.task_deadline + interval '30 seconds' then
    return 'expired';
  end if;

  perform _p_write_items(p_participant_id, p_items, p_contact);
  perform _p_event(p_participant_id, p_session_id, 'page_leave', v.current_page, v.current_round, v.current_page);

  if v.current_round is distinct from p_next_round then
    if v.current_round is not null then
      perform _p_event(p_participant_id, p_session_id, 'round_end', v.current_round::text, v.current_round, v.current_page);
    end if;
    if p_next_round is not null then
      perform _p_event(p_participant_id, p_session_id, 'round_start', p_next_round::text, p_next_round, p_next_page);
    end if;
  end if;

  if p_timer_end and v_running then
    update participants set task_end_at = now() where id = p_participant_id;
    perform _p_event(p_participant_id, p_session_id, 'timer_stop', null, v.current_round, v.current_page);
  end if;

  if p_timer_start and v.task_started_at is null then
    update participants set
      task_started_at = now(),
      task_deadline   = now() + make_interval(mins => p_timer_minutes)
    where id = p_participant_id;
    perform _p_event(p_participant_id, p_session_id, 'timer_start', null, p_next_round, p_next_page);
  end if;

  update participants set
    current_page  = p_next_page,
    current_round = p_next_round,
    last_seen_at  = now()
  where id = p_participant_id;
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- finish_session → 'ok' | 'not_active' | 'session_replaced' | 'not_at_finish'
-- ---------------------------------------------------------------------------
create function public.finish_session(
  p_participant_id uuid,
  p_session_id     uuid,
  p_finish_page    text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v participants%rowtype;
begin
  select * into v from participants where id = p_participant_id for update;
  if not found or v.status <> 'in_progress' then
    return 'not_active';
  end if;
  if v.session_id is distinct from p_session_id then
    return 'session_replaced';
  end if;
  if v.current_page is distinct from p_finish_page then
    return 'not_at_finish';
  end if;

  update participants set
    status       = 'completed',
    finished_at  = now(),
    last_seen_at = now()
  where id = p_participant_id;
  perform _p_event(p_participant_id, p_session_id, 'session_finish', null, null, p_finish_page);
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- close_stale_sessions → number of sessions closed (status timed_out)
-- Abandoned = deadline + 2 h passed while the task was running, or no
-- activity for 6 h before the timer started / after the task part ended.
-- ---------------------------------------------------------------------------
create function public.close_stale_sessions()
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_count integer;
begin
  update participants set status = 'timed_out'
  where status = 'in_progress'
    and (
      (task_deadline is not null and task_end_at is null and task_deadline + interval '2 hours' < now())
      or (task_deadline is null and coalesce(last_seen_at, started_at) + interval '6 hours' < now())
      or (task_end_at is not null and coalesce(last_seen_at, task_end_at) + interval '6 hours' < now())
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public._p_event(uuid, uuid, text, text, smallint, text, timestamptz) from public, anon, authenticated;
revoke all on function public._p_write_items(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.participant_login(text, uuid, timestamptz, text, text, text) from public, anon, authenticated;
revoke all on function public.save_responses(uuid, uuid, text, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.advance_step(uuid, uuid, text, jsonb, jsonb, text, text, smallint, boolean, boolean, integer) from public, anon, authenticated;
revoke all on function public.finish_session(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.close_stale_sessions() from public, anon, authenticated;
-- The helpers run inside the functions above with the caller's rights, so the
-- service role needs them too (still not callable by anon/authenticated).
grant execute on function public._p_event(uuid, uuid, text, text, smallint, text, timestamptz) to service_role;
grant execute on function public._p_write_items(uuid, jsonb, jsonb) to service_role;
grant execute on function public.participant_login(text, uuid, timestamptz, text, text, text) to service_role;
grant execute on function public.save_responses(uuid, uuid, text, jsonb, jsonb) to service_role;
grant execute on function public.advance_step(uuid, uuid, text, jsonb, jsonb, text, text, smallint, boolean, boolean, integer) to service_role;
grant execute on function public.finish_session(uuid, uuid, text) to service_role;
grant execute on function public.close_stale_sessions() to service_role;
