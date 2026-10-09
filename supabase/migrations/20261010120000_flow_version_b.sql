-- PLAN-05: flow B (Opsi B, 18 steps) becomes the default for new participants.
-- participants.flow_version is copied at first login and never changes afterwards, so
-- participants already in progress keep flow A. Set back to "A" to use the old flow.
update public.settings set value = '"B"'::jsonb where key = 'flow_version';
