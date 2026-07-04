-- =============================================================================
-- 0026 — Biblioteca 2.0 (F1): slug + cover_url + click_count em resources/apps.
-- Aditiva e reversivel. Slug: coluna anulavel -> backfill deterministico
-- (slugify + sufixo -N em colisao) -> NOT NULL + indice unico. Contador via RPC
-- atomica (+1, sem valor do cliente, sem pontos).
-- =============================================================================

-- Slugify SQL (sem dependencia externa; mapeia acentos PT-BR via translate).
create or replace function public.slugify(v text)
returns text language sql immutable as $$
  select trim(both '-' from
    regexp_replace(
      lower(translate(coalesce(v, ''),
        'áàâãäéèêëíìîïóòôõöúùûüçñ',
        'aaaaaeeeeiiiiooooouuuucn')),
      '[^a-z0-9]+', '-', 'g'));
$$;

-- Colunas -------------------------------------------------------------------
alter table public.resources
  add column if not exists slug text,
  add column if not exists cover_url text,
  add column if not exists click_count integer not null default 0;

alter table public.apps
  add column if not exists slug text,
  add column if not exists cover_url text,
  add column if not exists click_count integer not null default 0;

-- Backfill slug (deterministico: base = slugify(title/name) com fallback; sufixo
-- -N por ordem de criacao quando colidir). So preenche onde ainda esta nulo.
update public.resources r set slug = t.s
from (
  select id, base || case when rn = 1 then '' else '-' || rn end as s
  from (
    select id,
      coalesce(nullif(public.slugify(title), ''), 'recurso') as base,
      row_number() over (
        partition by coalesce(nullif(public.slugify(title), ''), 'recurso')
        order by created_at, id
      ) as rn
    from public.resources
  ) x
) t
where r.id = t.id and r.slug is null;

update public.apps a set slug = t.s
from (
  select id, base || case when rn = 1 then '' else '-' || rn end as s
  from (
    select id,
      coalesce(nullif(public.slugify(name), ''), 'aplicativo') as base,
      row_number() over (
        partition by coalesce(nullif(public.slugify(name), ''), 'aplicativo')
        order by created_at, id
      ) as rn
    from public.apps
  ) x
) t
where a.id = t.id and a.slug is null;

-- Indice unico (backfill preencheu os existentes; a Server Action garante slug
-- em todo novo item). Coluna fica NULLABLE por compat com o seed local-dev
-- (insere sem slug; migrations rodam ANTES do seed). Na cloud o backfill zera os
-- nulos e novos itens sempre vem com slug do app.
create unique index if not exists resources_slug_uidx on public.resources (slug);
create unique index if not exists apps_slug_uidx on public.apps (slug);

-- Contadores atomicos -------------------------------------------------------
-- +1 fixo num id publico (nao confia em quantidade do cliente; nao gera pontos).
create or replace function public.increment_resource_click(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.resources set click_count = click_count + 1 where id = p_id;
$$;

create or replace function public.increment_app_click(p_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.apps set click_count = click_count + 1 where id = p_id;
$$;

revoke execute on function public.increment_resource_click(uuid) from public;
revoke execute on function public.increment_app_click(uuid) from public;
grant execute on function public.increment_resource_click(uuid) to authenticated;
grant execute on function public.increment_app_click(uuid) to authenticated;
