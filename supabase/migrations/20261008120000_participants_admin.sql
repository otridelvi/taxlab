-- =============================================================================
-- Taxlab · Migration 0002 · Participant administration (PLAN-02)
-- - participants.current_round (two rounds, PRD 0.2); drop unused case_order
-- - Atomic functions for generate / change cell / deactivate, each writing
--   its audit row in the same transaction (FSD-Admin 0.2 §6.3, §6.4, §9).
-- Functions are only executable by the service role (server side).
-- =============================================================================

alter table public.participants
  add column current_round smallint check (current_round in (1, 2));

-- Case order is always 1–14 (decision K-6), so the per-participant order is not stored.
alter table public.participants drop column case_order;

-- Search key without dashes, so "7KQ2M9" and "7kq2-m9" both match.
alter table public.participants
  add column code_key text generated always as (replace(access_code, '-', '')) stored;

create index participants_code_key_idx on public.participants (code_key);
create index participants_created_at_idx on public.participants (created_at desc);
create index participants_started_at_idx on public.participants (started_at desc nulls last);

-- ---------------------------------------------------------------------------
-- create_batch: insert batch + participants + audit atomically.
-- p_codes and p_cells are parallel arrays (same length, same order).
-- A duplicate access code raises unique_violation (23505); nothing is kept.
-- ---------------------------------------------------------------------------
create function public.create_batch(
  p_admin_id    uuid,
  p_label       text,
  p_mode        public.assignment_mode,
  p_manual_cell smallint,
  p_codes       text[],
  p_cells       smallint[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_batch_id uuid;
  v_quantity integer := coalesce(array_length(p_codes, 1), 0);
  v_allocation jsonb;
begin
  if v_quantity = 0 or v_quantity <> coalesce(array_length(p_cells, 1), 0) then
    raise exception 'codes and cells must be non-empty arrays of equal length';
  end if;

  insert into batches (label, mode, manual_cell, quantity, created_by)
  values (nullif(trim(p_label), ''), p_mode, p_manual_cell, v_quantity, p_admin_id)
  returning id into v_batch_id;

  insert into participants (access_code, cell, batch_id)
  select t.code, t.cell, v_batch_id
  from unnest(p_codes, p_cells) as t (code, cell);

  select jsonb_object_agg(c.cell::text, c.n)
  into v_allocation
  from (select cell, count(*) as n from unnest(p_cells) as cell group by cell) c;

  insert into audit_logs (admin_id, action, detail)
  values (
    p_admin_id,
    'generate',
    jsonb_build_object(
      'batch_id', v_batch_id,
      'label', nullif(trim(p_label), ''),
      'quantity', v_quantity,
      'mode', p_mode,
      'cell', p_manual_cell,
      'allocation', v_allocation
    )
  );

  return v_batch_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- change_participant_cell → 'ok' | 'not_found' | 'locked' | 'same_cell'
-- Only while status = 'not_started' (R-1).
-- ---------------------------------------------------------------------------
create function public.change_participant_cell(
  p_admin_id       uuid,
  p_participant_id uuid,
  p_cell           smallint,
  p_reason         text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_current participants%rowtype;
begin
  select * into v_current from participants where id = p_participant_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_current.status <> 'not_started' then
    return 'locked';
  end if;
  if v_current.cell = p_cell then
    return 'same_cell';
  end if;

  update participants set cell = p_cell where id = p_participant_id;

  insert into audit_logs (admin_id, action, participant_id, detail)
  values (p_admin_id, 'change_cell', p_participant_id,
          jsonb_build_object('from', v_current.cell, 'to', p_cell, 'reason', p_reason));
  return 'ok';
end;
$$;

-- ---------------------------------------------------------------------------
-- deactivate_participant → 'ok' | 'not_found' | 'not_deactivatable'
-- ---------------------------------------------------------------------------
create function public.deactivate_participant(
  p_admin_id       uuid,
  p_participant_id uuid,
  p_reason         text
)
returns text
language plpgsql
set search_path = public
as $$
declare
  v_status participant_status;
begin
  select status into v_status from participants where id = p_participant_id for update;
  if not found then
    return 'not_found';
  end if;
  if v_status <> 'not_started' then
    return 'not_deactivatable';
  end if;

  update participants set status = 'cancelled' where id = p_participant_id;

  insert into audit_logs (admin_id, action, participant_id, detail)
  values (p_admin_id, 'deactivate', p_participant_id, jsonb_build_object('reason', p_reason));
  return 'ok';
end;
$$;

revoke all on function public.create_batch(uuid, text, public.assignment_mode, smallint, text[], smallint[]) from public, anon, authenticated;
revoke all on function public.change_participant_cell(uuid, uuid, smallint, text) from public, anon, authenticated;
revoke all on function public.deactivate_participant(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.create_batch(uuid, text, public.assignment_mode, smallint, text[], smallint[]) to service_role;
grant execute on function public.change_participant_cell(uuid, uuid, smallint, text) to service_role;
grant execute on function public.deactivate_participant(uuid, uuid, text) to service_role;
