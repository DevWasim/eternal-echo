-- Eternal Echo initial Supabase schema.
-- Paste this whole file into the Supabase SQL editor, or run it with Supabase CLI.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  email text unique,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.ancestors (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  nickname text,
  birth_year int,
  death_year int,
  relationship text,
  origin_city text,
  origin_country text,
  religion text,
  language_preference text default 'ur',
  voice_clone_id text,
  persona_summary text,
  status text default 'draft' check (status in ('draft', 'processing', 'ready', 'archived')),
  created_at timestamptz default now()
);

create table if not exists public.memory_sources (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references public.ancestors(id) on delete cascade not null,
  type text check (
    type in (
      'audio_recording',
      'whatsapp_export',
      'letter_text',
      'video_transcript',
      'journal_entry',
      'interview_response'
    )
  ) not null,
  raw_content text,
  processed_content text,
  duration_seconds int,
  language text,
  created_at timestamptz default now()
);

create table if not exists public.memory_chunks (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references public.ancestors(id) on delete cascade not null,
  source_id uuid references public.memory_sources(id) on delete cascade not null,
  content text not null,
  embedding vector(1536),
  topic_tags text[],
  emotional_tone text,
  time_period text,
  created_at timestamptz default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references public.ancestors(id) on delete cascade not null,
  user_id uuid references public.profiles(id),
  session_title text,
  started_at timestamptz default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  role text check (role in ('user','ancestor')) not null,
  content text,
  audio_url text,
  created_at timestamptz default now()
);

-- Realtime progress events for processing screens.
create table if not exists public.processing_events (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references public.ancestors(id) on delete cascade not null,
  stage text not null,
  detail text,
  progress int default 0 check (progress between 0 and 100),
  created_at timestamptz default now()
);

-- Family sharing and magic-link invite bookkeeping.
create table if not exists public.ancestor_invites (
  id uuid primary key default gen_random_uuid(),
  ancestor_id uuid references public.ancestors(id) on delete cascade not null,
  invited_by uuid references public.profiles(id) on delete cascade not null,
  email text not null,
  accepted_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  unique (ancestor_id, email)
);

create index if not exists memory_chunks_embedding_idx
  on public.memory_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists ancestors_owner_id_idx on public.ancestors(owner_id);
create index if not exists memory_sources_ancestor_id_idx on public.memory_sources(ancestor_id);
create index if not exists memory_chunks_ancestor_id_idx on public.memory_chunks(ancestor_id);
create index if not exists conversations_ancestor_id_idx on public.conversations(ancestor_id);
create index if not exists conversations_user_id_idx on public.conversations(user_id);
create index if not exists messages_conversation_id_idx on public.messages(conversation_id);

create or replace function public.match_memories(
  query_embedding vector(1536),
  ancestor_id_param uuid,
  match_count int
)
returns table (
  id uuid,
  source_id uuid,
  content text,
  topic_tags text[],
  emotional_tone text,
  time_period text,
  similarity float
)
language sql
stable
as $$
  select
    memory_chunks.id,
    memory_chunks.source_id,
    memory_chunks.content,
    memory_chunks.topic_tags,
    memory_chunks.emotional_tone,
    memory_chunks.time_period,
    1 - (memory_chunks.embedding <=> query_embedding) as similarity
  from public.memory_chunks
  where memory_chunks.ancestor_id = ancestor_id_param
    and memory_chunks.embedding is not null
  order by memory_chunks.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.profiles enable row level security;
alter table public.ancestors enable row level security;
alter table public.memory_sources enable row level security;
alter table public.memory_chunks enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.processing_events enable row level security;
alter table public.ancestor_invites enable row level security;

create policy "Profiles are readable by owner"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Profiles are insertable by owner"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Profiles are updatable by owner"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Ancestors are readable by owner"
  on public.ancestors for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Ancestors are insertable by owner"
  on public.ancestors for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "Ancestors are updatable by owner"
  on public.ancestors for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Ancestors are deletable by owner"
  on public.ancestors for delete
  to authenticated
  using (owner_id = auth.uid());

create policy "Sources follow ancestor ownership"
  on public.memory_sources for all
  to authenticated
  using (
    exists (
      select 1 from public.ancestors
      where ancestors.id = memory_sources.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ancestors
      where ancestors.id = memory_sources.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Chunks follow ancestor ownership"
  on public.memory_chunks for all
  to authenticated
  using (
    exists (
      select 1 from public.ancestors
      where ancestors.id = memory_chunks.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ancestors
      where ancestors.id = memory_chunks.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Conversations are readable by owner or participant"
  on public.conversations for select
  to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.ancestors
      where ancestors.id = conversations.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Conversations are insertable by participant"
  on public.conversations for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Conversations are updatable by participant"
  on public.conversations for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Messages follow conversation access"
  on public.messages for all
  to authenticated
  using (
    exists (
      select 1 from public.conversations
      left join public.ancestors on ancestors.id = conversations.ancestor_id
      where conversations.id = messages.conversation_id
        and (conversations.user_id = auth.uid() or ancestors.owner_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.conversations
      left join public.ancestors on ancestors.id = conversations.ancestor_id
      where conversations.id = messages.conversation_id
        and (conversations.user_id = auth.uid() or ancestors.owner_id = auth.uid())
    )
  );

create policy "Processing events follow ancestor ownership"
  on public.processing_events for all
  to authenticated
  using (
    exists (
      select 1 from public.ancestors
      where ancestors.id = processing_events.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ancestors
      where ancestors.id = processing_events.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Invites are readable by owner or invited email"
  on public.ancestor_invites for select
  to authenticated
  using (
    invited_by = auth.uid()
    or accepted_by = auth.uid()
    or lower(email) = lower(auth.jwt() ->> 'email')
  );

create policy "Owners can create invites"
  on public.ancestor_invites for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and exists (
      select 1 from public.ancestors
      where ancestors.id = ancestor_invites.ancestor_id
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Invited users can accept invites"
  on public.ancestor_invites for update
  to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email') or invited_by = auth.uid())
  with check (lower(email) = lower(auth.jwt() ->> 'email') or invited_by = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('memory-files', 'memory-files', false, 524288000),
  ('conversation-audio', 'conversation-audio', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

create policy "Owners can upload ancestor memory files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'memory-files'
    and exists (
      select 1 from public.ancestors
      where ancestors.id::text = (storage.foldername(name))[1]
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Owners can read ancestor memory files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'memory-files'
    and exists (
      select 1 from public.ancestors
      where ancestors.id::text = (storage.foldername(name))[1]
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Owners can delete ancestor memory files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'memory-files'
    and exists (
      select 1 from public.ancestors
      where ancestors.id::text = (storage.foldername(name))[1]
        and ancestors.owner_id = auth.uid()
    )
  );

create policy "Conversation audio is publicly readable"
  on storage.objects for select
  to public
  using (bucket_id = 'conversation-audio');

create policy "Authenticated users can upload generated conversation audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'conversation-audio');

alter publication supabase_realtime add table public.processing_events;
alter publication supabase_realtime add table public.ancestors;
