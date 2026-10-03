-- Ranking público entre usuários autenticados, sem expor dados pessoais.
-- O XP é calculado somente a partir de registros reais da propriedade.

create or replace function public.property_ranking()
returns table (
  "position" bigint,
  property_id text,
  property_name text,
  municipality text,
  xp bigint,
  is_mine boolean
)
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  with property_scores as (
    select
      p.id as property_id,
      p.owner_user_id,
      p.name as property_name,
      p.municipality,
      (
        (select count(*) * 10 from public.animals a where a.owner_user_id = p.owner_user_id)
        + (select count(*) * 20 from public.animals a where a.owner_user_id = p.owner_user_id and nullif(trim(a.electronic_id), '') is not null)
        + (select count(*) * 5 from public.water_records w where w.owner_user_id = p.owner_user_id)
        + (select count(*) * 10 from public.activities a where a.owner_user_id = p.owner_user_id and a.done = true)
        + (select count(*) * 10 from public.monitoring_records m where m.owner_user_id = p.owner_user_id)
        + (select count(*) * 5 from public.property_sectors s where s.owner_user_id = p.owner_user_id)
      )::bigint as xp
    from public.properties p
    join public.profiles profile on profile.id = p.owner_user_id
    where nullif(trim(p.name), '') is not null
      and profile.banned_at is null
  ), ranked as (
    select
      row_number() over (order by xp desc, lower(property_name), property_id) as "position",
      property_id,
      owner_user_id,
      property_name,
      municipality,
      xp
    from property_scores
  )
  select
    ranked."position",
    ranked.property_id,
    ranked.property_name,
    ranked.municipality,
    ranked.xp,
    ranked.owner_user_id = auth.uid() as is_mine
  from ranked
  where auth.uid() is not null
    and public.is_active_user()
  order by ranked."position"
  limit 50;
$$;

revoke all on function public.property_ranking() from public;
revoke all on function public.property_ranking() from anon;
grant execute on function public.property_ranking() to authenticated;

comment on function public.property_ranking() is
'Ranking de propriedades por XP: animal 10, NFC vinculado +20, água 5, atividade concluída 10, monitoramento 10 e setor 5.';
