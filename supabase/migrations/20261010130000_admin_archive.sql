-- =============================================================================
-- Taxlab · Migration 0005 · Session reset archive (PLAN-07b, D-8, D-12)
-- - archived_sessions: snapshot of a participant's session before a technical reset
-- - reset_session(): archive + clear responses/events + back to not_started
--   + audit row, all in one transaction (FSD-Admin 0.2 §6.5, §9)
-- Service role only. `contacts` are never touched.
-- =============================================================================

create table public.archived_sessions (
  id              uuid primary key default gen_random_uuid(),
  participant_id  uuid references public.participants (id) on delete set null,
  access_code     text not null,
  cell            smallint not null,
  reset_by        uuid references public.admins (id) on delete set null,
  reason          text not null,
  snapshot        jsonb not null,
  archived_at     timestamptz not null default now()
);

create index archived_sessions_participant_idx on public.archived_sessions (participant_id);

alter table public.archived_sessions enable row level security;

-- ---------------------------------------------------------------------------
-- reset_session → 'ok' | 'not_found' | 'not_resettable'
-- Only in_progress and timed_out sessions can be reset (D6: technical problems
-- only; a completed participant is never reset). The cell stays the same.
-- ---------------------------------------------------------------------------
create function public.reset_session(
  p_participant_id uuid,
  p_admin_id       uuid,
  p_reason         text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_p participants%rowtype;
  v_responses jsonb;
  v_events jsonb;
begin
  select * into v_p from participants where id = p_participant_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_p.status not in ('in_progress', 'timed_out') then
    return 'not_resettable';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.item_key), '[]'::jsonb)
    into v_responses from responses r where r.participant_id = p_participant_id;
  select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb)
    into v_events from events e where e.participant_id = p_participant_id;

  insert into archived_sessions (participant_id, access_code, cell, reset_by, reason, snapshot)
  values (
    p_participant_id, v_p.access_code, v_p.cell, p_admin_id, p_reason,
    jsonb_build_object(
      'participant', to_jsonb(v_p),
      'responses', v_responses,
      'events', v_events
    )
  );

  delete from responses where participant_id = p_participant_id;
  delete from events where participant_id = p_participant_id;

  update participants set
    status = 'not_started',
    consent_at = null,
    started_at = null,
    task_deadline = null,
    finished_at = null,
    current_page = null,
    current_round = null,
    content_version = null,
    session_id = null,
    flow_version = null,
    task_started_at = null,
    task_end_at = null,
    timed_out = false,
    timed_out_at_page = null,
    last_seen_at = null
  where id = p_participant_id;

  insert into audit_logs (admin_id, action, participant_id, detail)
  values (
    p_admin_id, 'reset_session', p_participant_id,
    jsonb_build_object(
      'reason', p_reason,
      'from_status', v_p.status,
      'from_page', v_p.current_page,
      'responses', jsonb_array_length(v_responses),
      'events', jsonb_array_length(v_events)
    )
  );
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- delete_contacts: remove contact rows (incentive data), optionally per batch,
-- and write the audit row in the same transaction. Returns rows deleted.
-- ---------------------------------------------------------------------------
create function public.delete_contacts(
  p_admin_id uuid,
  p_batch_id uuid
)
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_deleted integer;
begin
  with gone as (
    delete from contacts c
    using participants p
    where p.id = c.participant_id
      and (p_batch_id is null or p.batch_id = p_batch_id)
    returning c.participant_id
  )
  select count(*) into v_deleted from gone;

  insert into audit_logs (admin_id, action, detail)
  values (p_admin_id, 'delete_contacts',
          jsonb_build_object('batch_id', p_batch_id, 'scope', case when p_batch_id is null then 'all' else 'batch' end, 'deleted', v_deleted));
  return v_deleted;
end;
$$;

revoke all on function public.reset_session(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.delete_contacts(uuid, uuid) from public, anon, authenticated;
grant execute on function public.reset_session(uuid, uuid, text) to service_role;
grant execute on function public.delete_contacts(uuid, uuid) to service_role;
