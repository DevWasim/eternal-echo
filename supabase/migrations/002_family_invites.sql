-- Migration for family_invites table and RLS

-- 1. Table
create table if not exists public.family_invites (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references ancestors(id) on delete cascade,
  invited_by uuid references profiles(id),
  invitee_email text not null,
  token uuid default gen_random_uuid() unique,
  role text default 'viewer' check (role in ('viewer','contributor')),
  accepted_at timestamptz,
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '7 days')
);

-- 2. RLS: allow access to ancestor for accepted invites
alter table family_invites enable row level security;
create policy "Allow accepted invitee access" on family_invites
  for select using (
    invitee_email = auth.email() and accepted_at is not null
  );

-- 3. Conversations/messages RLS (example, update as needed)
-- (Assumes conversations and messages tables already exist)
-- Allow access if user has accepted invite for ancestor_id
-- You may need to adapt this to your schema
-- Example for conversations:
-- create policy "Allow invited user" on conversations
--   for select using (
--     exists (
--       select 1 from family_invites fi
--       where fi.ancestor_id = conversations.ancestor_id
--         and fi.invitee_email = auth.email()
--         and fi.accepted_at is not null
--     )
--   );
