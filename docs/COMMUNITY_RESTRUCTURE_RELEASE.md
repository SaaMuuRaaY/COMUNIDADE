# Release — Reestruturação da Comunidade (Portal Nexus)

Documento de release da reestruturação da Comunidade (Fases 1 → 6.6 + Fase 7).
Estado: **em produção**, com migrations aplicadas e validadas na cloud.

## Resumo

A Comunidade evoluiu de um feed plano de 7 categorias para uma arquitetura de
**grupos + canais** com **navegação unificada** e **URLs por unidade na raiz**,
preservando 100% dos usuários, posts, comentários, reações e pontos.

- **F2–F4:** grupos/canais estáticos (config em código), permissões por canal (UI + Server Action + RLS).
- **F5:** remap de categorias antigas → novos slugs + CHECK final + tabela de backup.
- **F6:** integração módulos ↔ comunidade por links.
- **F6.5:** **sidebar única** (módulos + canais + páginas); painel interno removido; Notificações/Perfil/Admin no header (sino + menu do avatar).
- **F6.6:** **`/community` = Feed Geral agregado**; cada canal em **URL raiz** (`/comece-por-aqui`, `/lives-e-encontros`, …); detalhe canônico em **`/post/[postId]`**; redirects de todas as URLs antigas.
- **Fase 7 (headers/liberação):** headers ricos (SectionBanner) em todos os feeds; canais `rotinas` e `suporte-tecnico` liberados para publicação.

## Arquitetura final

### Rotas
- `/community` → **Feed Geral** (posts de todos os canais; fixados primeiro; busca `?q=`; composer p/ `chat-networking`).
- `/<canal>` → 13 rotas raiz explícitas (sem catch-all; zero colisão com módulos), via componente compartilhado `CommunityChannelFeed` (`src/components/community/community-feed.tsx`).
- `/post/[postId]` → detalhe de post (canônico).
- Módulos: `/courses` `/resources` `/apps` `/calendar` `/leaderboard` `/agentes` `/support/report` (rotas técnicas inalteradas; labels visuais: Cursos e Materiais, Biblioteca, Calendário de Eventos, Agentes Especialistas).
- Páginas: `/community/faq`, `/community/regras`.

### Redirects (retrocompat)
- `/community/c/[channel]` → `/<canal>` (raiz) · legado sem raiz → `/community`.
- `/community/[postId]` → slug de canal → raiz · UUID → `/post/[id]` · senão 404.
- `/community?category=X` → rota raiz do canal (preserva `?q=`).

### Fonte de navegação
- `src/lib/navigation.ts` (server-safe, união `route|channel|page`) alimenta a sidebar e o drawer mobile via `NavTree`; `channelHref()` (em `structure.ts`) é o mapa canônico canal→URL. Active-state: "Comunidade" ativo só em `/community` e `/post/*`; cada canal ativa só sua rota.

## Migrations — todas aplicadas e VALIDADAS na cloud (2026-07-02)

| Migration | Conteúdo | Status |
|---|---|---|
| `0013_channel_check_transition` | CHECK transitório (antigos + novos) | ✅ aplicada |
| `0014_channel_permissions_rls` | funções `channel_*` + RLS por canal (INSERT/UPDATE/comentário) | ✅ aplicada |
| `0015_migrate_categories_to_channels` | remap categoria→canal + tabela `community_migration_backup` + CHECK final | ✅ aplicada |
| `0016_add_rotinas_suporte_channels` | +`rotinas`/`suporte-tecnico` no CHECK (17) + `rotinas` em `channel_requires_mod` | ✅ aplicada |

**Auditoria read-only da cloud (100%):** CHECK com 17 slugs; 3 funções `channel_*` presentes; `channel_requires_mod('rotinas')=true`; backup table existe; **0 slugs antigos**, **0 slugs inválidos**; RLS `posts_insert_own/update_own` + `comments_insert_own` ativas; **total=6 posts, backup=6 (zero perda)**; distribuição `chat-networking=5, comunicados=1`.

## Permissões

- **Config** (`structure.ts`): por canal — `type` (discussion/announcement), `publish` (member/moderator/admin), `comments`, `isOfficial`.
- **3 camadas:** UI (composer só oferece canais permitidos) → Server Action (`canPostInChannel`/`canCommentInChannel`) → RLS (`channel_requires_mod`/`channel_requires_admin`/`channel_allows_comments`). PostgREST direto não fura as regras.
- Admin protegido por `proxy.ts` (`role='admin'`) + `requireAdmin` — independente da UI.

## Headers e canais liberados (Fase 7)

- Todos os feeds usam `SectionBanner` (ícone + eyebrow do grupo + título + descrição), no padrão visual de `/agentes`.
- Canais **sem posts** mantêm o aviso de feed vazio (sem conteúdo fabricado).
- `PENDING_CHANNELS` esvaziado: `rotinas` (publica moderador) e `suporte-tecnico` (publica membro) liberados — CHECK/RLS já aceitam (0016).

## Gates e validação

- `pnpm typecheck` = 0 · `pnpm lint` = 0 · `pnpm build` = 0 · `git diff --check` limpo.
- Review adversarial da F6.5 e da F6.6: **0 bugs confirmados**.
- Auditoria da cloud: **100%** (ver acima).

## QA — checklist

Verificado (código/build):
- [x] `/community` não redireciona; renderiza feed agregado.
- [x] 13 rotas raiz + `/post/[postId]` + redirects compilam, sem colisão de rota.
- [x] Links internos de post → `/post/[id]`; módulos → rota raiz do canal.
- [x] Active-state nunca acende dois itens; Admin fora da sidebar.

A validar em runtime (navegador, conta de teste — não executado aqui para não escrever em produção):
- [ ] Papéis: owner / admin / moderador / membro / banido.
- [ ] Publicar/comentar/reagir/editar/fixar por canal; barrar canal restrito.
- [ ] Responsividade: desktop / tablet / mobile; sidebar / drawer / header.
- [ ] E2E Playwright (`pnpm test:e2e`) em ambiente de teste dedicado.

## Riscos restantes

- Itens de header/liberação (Fase 7) só chegam à produção no **próximo deploy** (commit + redeploy).
- Composer do Feed Geral posta em `chat-networking` (seletor de canal = backlog).
- 4 canais legados (`dicas-novidades`, `servicos-oportunidades`, `projetos-negocios`, `beneficios`): fora da nav, preservados no banco; aguardam inventário de conteúdo.

## Rollback

- Código: `git revert` do(s) commit(s).
- Dados (0015): `update posts p set category = b.old_category from community_migration_backup b where b.post_id = p.id` + recriar o CHECK transitório.
- RLS (0014/0016): recriar as políticas/funções anteriores (idempotente).

## Backlog

- Seletor de canal no composer do Feed Geral.
- Inventário/decisão dos 4 canais legados (manter/mesclar).
- Headers/conteúdo de boas-vindas por canal (posts oficiais reais, sem fabricação).
- Agentes Especialistas (`/agentes/[agentSlug]`) — feature futura.
