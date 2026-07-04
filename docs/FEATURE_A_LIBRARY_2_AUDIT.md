# FEATURE A — Biblioteca 2.0 · F0 (Auditoria detalhada + contrato preliminar)

Escopo: evoluir **Recursos** (`/resources`) e **Aplicativos** (`/apps`) com slug, URL individual, página de detalhe, capa e contador de cliques. READ-ONLY — nada implementado.

## 1. Baseline
Branch master, HEAD caaa13e, gates verdes. Migrations 0001-0025. Labels "Biblioteca/Aplicativos"; rotas técnicas `/resources` `/apps` (não renomear).

## 2. Estado atual — `resources` (0004)
Colunas: `id, title, description, category, file_url, file_storage_path, file_type, created_by (→profiles SET NULL), created_at`. Índices: `category`, `created_at desc`. **Sem** slug/cover_url/click_count. `file_url` = URL externa OU path em Storage. RLS (0006): SELECT authenticated; write = `is_moderator()`.

## 3. Estado atual — `apps` (0004)
Colunas: `id, name, description, category, type, status, url, embed_url, file_url, icon_url, created_by, created_at, updated_at`. Índices: `category`, `status`. **Sem** slug/cover_url/click_count. Tem `icon_url` (hoje renderizado como placeholder). RLS: SELECT authenticated; write = `is_admin()`. **`createAppAction` só cria; NÃO há update** (só delete) — necessário `updateAppAction`.

## 4. Inconsistências
- `apps.icon_url` armazenado mas não renderizado (placeholder). 
- Sem página de detalhe → título é o único "endereço"; mudar título hoje não quebra nada (não há link estável), mas ao introduzir slug precisa estabilidade.

## 5. Duplicações
Nenhuma prejudicial. Reusar `slugify()` (utils.ts) e `useImageUpload` (hooks) — não recriar. Card de resource e card de app são distintos (ok manter).

## 6. Sobreposições
`file_url` externo vs `file_storage_path` (Storage) coexistem — aceitável. Capa nova (`cover_url`) não conflita com `icon_url` de apps (icon = ícone pequeno; cover = imagem destaque) — decidir se apps usam cover, icon ou ambos (recomendo `cover_url` para destaque, manter `icon_url`).

## 7. Legacy
Nada a remover.

## 8. Bugs & tipagem
Sem `any` crítico nas listagens. `select` específico (não `*`) nas queries de resources/apps — ok. Contador exigirá RPC atômica (evitar `update ... set x = x+1` com read-modify-write no app).

## 9. Banco (contrato proposto — migração `0026`, NÃO criada)
```
alter table resources add column slug text, add column cover_url text, add column click_count int not null default 0;
alter table apps      add column slug text, add column cover_url text, add column click_count int not null default 0;
-- backfill slug: slugify(title/name) + sufixo -<n> determinístico em colisão
create unique index resources_slug_uidx on resources (slug);  -- após backfill (slug NOT NULL depois)
create unique index apps_slug_uidx on apps (slug);
-- RPCs atômicas:
create function increment_resource_click(p_id uuid) ... security definer, search_path=public: update resources set click_count = click_count + 1 where id = p_id;
create function increment_app_click(p_id uuid) ...  idem apps;
```
Regras: slug **anulável** na criação da coluna → backfill → depois NOT NULL + índice unique. Colisão: sufixo determinístico (`-2`, `-3`). Estável (não muda ao editar título). Validação server (regex `^[a-z0-9-]+$`).

## 10. Storage (decisão na F1)
Buckets (0007): `avatars` (5MB, image, owner write), `resources` (100MB, mod write), `apps` (50MB, admin write), `course-covers` (10MB, image, mod write, all read). **NÃO assumir** `course-covers` para capas: na F1 comparar **reusar bucket existente** (paths/policies corretos por papel) vs **criar `content-covers`** (10MB, image/*, RLS: resources→mod, apps→admin write; all read). Reuso de `useImageUpload(bucket, maxBytes)` + `safeStoragePath` (`<uid>/<file>`). Substituição de capa deve **remover o arquivo antigo** (evitar acúmulo). Colisão de path mitigada por `safeStoragePath` + id.

## 11. RLS
SELECT já ok (authenticated). Ajuste: permitir UPDATE de `cover_url`/`slug` dentro do papel (resources=mod, apps=admin) — já coberto pelas policies de write existentes (write = insert/update/delete). RPC de click = SECURITY DEFINER (grant mínimo a authenticated, só faz +1 no id).

## 12. Slugs
Contrato: único, estável, minúsculo, `[a-z0-9-]`, fallback pra id em colisão irresolvível, índice unique, validação server, **não** auto-alterar ao editar título (troca de slug seria opção manual futura + redirect).

## 13. Rotas
Criar `/resources/[slug]` e `/apps/[slug]`. Compatibilidade: aceitar id como fallback (link antigo por id → resolve). Slug inválido/inexistente → `notFound()`. Redirect após alteração de slug: fora do MVP (slug estável). Links externos (resource `file_url`/app `url`) abrem em nova aba.

## 14. Páginas de detalhe
`/resources/[slug]`: capa + título + descrição + categoria + botão **Baixar/Acessar** (dispara contador). `/apps/[slug]`: capa/icon + descrição + status + botão **Abrir** (dispara contador) + embed se `type=embed`. Não contar pageview.

## 15. Capas
Formato JPG/PNG/WebP; ≤ 2MB; proporção rec. 16:9; opcional; **fallback por categoria** (ícone/cor); path seguro; substituição sem acúmulo; RLS por papel. Render: card (antes do título) + detalhe + mobile (largura total, aspect-video).

## 16. Contadores
`click_count` = **cliques TOTAIS** (não únicos). Incrementa **só em ação intencional** (Baixar/Acessar/Abrir), **nunca no pageview**. **Modelo recomendado: coluna agregada + RPC atômica** (não tabela de eventos — v2). A falha da métrica **nunca bloqueia** o acesso (fire-and-forget: navega/baixa mesmo se a RPC falhar).

## 17. Formulários
`ResourceForm` (title, description, category, file_url, file_type) e `AppComposer` (name, description, category, type, status, url, embed_url, file_url, icon_url) → **adicionar** slug (auto via slugify ao digitar título, editável) + cover (CoverUploader). App precisa de fluxo de **edição** (novo `updateAppAction`).

## 18. Server Actions
`createResourceAction`/`createAppAction` (resources-apps-events.ts) → incluir slug+cover. **Criar `updateResourceAction` (se faltar)** e **`updateAppAction`**. Nova action `incrementResourceClick`/`incrementAppClick` (chama a RPC; fire-and-forget). Validar slug no schema Zod.

## 19. Performance
Sem N+1: detalhe = 1 fetch por slug. Contador = 1 RPC atômica (sem read-modify-write). Listagens inalteradas. Capas via `next/image` com `sizes` adequado.

## 20. Segurança
RPC de click não confia em quantidade (só +1), id validado, sem gerar pontos, grants mínimos, teste concorrente. Upload restrito por RLS de bucket + MIME + tamanho. Nada exposto além do já público (resources/apps são SELECT-authenticated).

## 21. Plano F1–F6
F1 dados/URLs (0026 + schemas + decisão de bucket) → F2 capas/Storage (+ updateApp) → F3 páginas [slug] + capas na listagem → F4 contadores atômicos → F5 paridade apps → F6 QA+release. Cada fase com gate + aprovação.

## 22. Migração 0026 (PROPOSTA — não criada)
Ver item 9. Aditiva, reversível. Backfill de slug idempotente. Índices unique após backfill.

## 23. Rollback
`drop column slug/cover_url/click_count` + `drop function increment_*_click` + `drop index *_slug_uidx`. Colunas nullable no início → sem perda. Arquivos de capa órfãos: limpeza manual/opcional.

## 24. Critérios de aceite
Toda resource/app tem slug único e estável; `/resources/[slug]` e `/apps/[slug]` resolvem (e id como fallback); capa renderiza com fallback; contador incrementa só em ação intencional e nunca bloqueia acesso; RPC atômica sem race; gates verdes; sem `select("*")` novo.

## 25. Arquivos futuros (F1+)
`supabase/migrations/0026_*.sql`; `src/components/shared/cover-uploader.tsx`; `src/app/(app)/resources/[slug]/page.tsx`; `src/app/(app)/apps/[slug]/page.tsx`; `src/server/queries` (getResourceBySlug/getAppBySlug); edições em `resources-apps-events.ts`, `schemas.ts`, `resource-browser.tsx`, `apps/page.tsx`, admin forms.

## 26. Riscos
Slug instável → links quebrados (mitigado: estável + fallback id). Acúmulo de arquivos de capa (mitigado: remover antigo na troca). Bucket errado (mitigado: decisão explícita na F1). Contador manipulável (mitigado: RPC +1, sem valor do cliente).

## 27. Recomendação final
**APROVADO PARA REVISÃO DA F1 DA BIBLIOTECA.** Sem bloqueadores próprios (Biblioteca não toca pontos). Item P0 transversal (`award_points`/X2) é independente — recomendado corrigir antes/paralelo, não bloqueia A.
