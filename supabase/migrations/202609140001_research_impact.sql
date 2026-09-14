create table if not exists public.research_projects (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"tests":[],"methodology":{}}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint research_payload_object check (jsonb_typeof(payload) = 'object')
);

alter table public.research_projects enable row level security;

drop policy if exists "research_select_own" on public.research_projects;
create policy "research_select_own" on public.research_projects for select to authenticated using (auth.uid() = user_id);

drop policy if exists "research_insert_own" on public.research_projects;
create policy "research_insert_own" on public.research_projects for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "research_update_own" on public.research_projects;
create policy "research_update_own" on public.research_projects for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

revoke all on public.research_projects from anon;
grant select, insert, update on public.research_projects to authenticated;
