# Fase 6.5 — Unificação da Navegação (Portal Nexus / Comunidade)

Subfase inserida entre a Fase 6 e a Fase 7 (congelada) do Roadmap Mestre de
Reestruturação da Comunidade. Objetivo de produto: **uma única sidebar** —
módulos, canais e páginas na mesma navegação visual — eliminando o "app dentro
de app" (a segunda sidebar interna da Comunidade). Internamente, os tipos
técnicos continuam separados (rota / canal / página / admin).

## O que mudou

- **Fonte única de navegação** (`src/lib/navigation.ts`, server-safe, pura): união
  discriminada `route | channel | page`, `icon` como string, agrupada em 6 grupos
  visuais (Geral, Boas-vindas, Aprender e Construir, Participação, Networking,
  Ajuda e Benefícios). Alimenta desktop e mobile. `NavIcon` (`nav-icon.tsx`)
  resolve id→Lucide; `NavTree` (`nav-tree.tsx`) é o render compartilhado
  sidebar↔drawer (sem duplicar markup).
- **Sidebar única** (`sidebar.tsx`): dirigida por `NAV_TREE`; deixou de receber
  `isAdmin`; sem footer "Sair".
- **Painel interno da Comunidade REMOVIDO**: `community/layout.tsx` virou
  passthrough; o feed ocupa toda a área útil; o cabeçalho de cada canal
  permanece dentro do conteúdo. Componentes órfãos apagados: `channel-nav.tsx`,
  `nav-items.ts`.
- **Header** (`header.tsx`): drawer mobile usa `NavTree`; à direita, `[sino] [avatar]`.
  Menu do avatar: **Meu perfil · Configurações visuais · Painel administrativo
  (só admin) · Sair**. Notificações, Perfil e Admin saíram da sidebar. O
  "SettingsDrawer" reutilizado é o `ThemeSettings`, agora **controlável**
  (`open`/`onOpenChange`/`hideTrigger`, backward-compat) e acionado pelo item
  "Configurações visuais".
- **Rótulos visuais** (sem tocar rotas/tabelas): Recursos → **Biblioteca**,
  Cursos → **Cursos e Materiais**, Calendário → **Calendário de Eventos**.
- **Páginas novas**: `/agentes` (Agentes Especialistas — "Em preparação", sem
  backend/LLM/formulário falso) e `/support/report` (Reportar Problema — página
  estática com checklist; ação real encaminha ao canal de suporte da comunidade;
  sem sistema de tickets, sem e-mail hardcodado).
- **Mobile**: bottom bar enxuta (`BOTTOM_NAV`, sem filtro de hrefs frágil); a
  árvore completa vive no drawer, mesma fonte da sidebar; drawer fecha ao navegar.

## Banco / dados

**Zero migration aplicada. Zero dado alterado.** RLS, Auth, Storage, posts,
comentários, likes, reações e pontos intactos. O gating real de `/admin`
(proxy.ts + `requireAdmin`) não foi tocado — mover o link Admin para o avatar é
puramente visual.

## Bloqueios sinalizados (aguardam decisão do IAGO)

1. **Canais NOVOS `rotinas` e `suporte-tecnico`** não existem no CHECK atual.
   Foram adicionados à config (`PENDING_CHANNELS`): ficam **navegáveis/leitura**,
   com composer oculto ("Canal em ativação") e `canPostInChannel` negando
   publicação até a **migration `0016`** (criada e **validada só localmente**;
   **NÃO aplicada na cloud**: +2 slugs no CHECK → 17, `rotinas` em
   `channel_requires_mod`). Ao aplicar a 0016, esvaziar `PENDING_CHANNELS`.
2. **4 canais LEGADOS/DEPRECIADOS** (`dicas-novidades`, `servicos-oportunidades`,
   `projetos-negocios`, `beneficios`) — **ocultos da sidebar** (fora de
   `navigation.ts`) mas **PRESERVADOS**: continuam na config
   (`DEPRECATED_CHANNELS` em `structure.ts`), no CHECK do banco e com URL direta
   (`/community/c/<slug>`) e posts intactos. **Nenhum canal foi removido, nenhum
   post alterado, nenhum conteúdo migrado.** `projetos-negocios` é **alvo do
   remap** da Fase 5. Destinos prováveis (ainda NÃO executados): `servicos-oportunidades`→
   `vagas-oportunidades`; `projetos-negocios`→`compartilhe-seu-projeto`;
   `beneficios`→`cupons-descontos` ou página institucional; `dicas-novidades`→
   decidir entre `comunicados` e `chat-networking`. Aguardam inventário de conteúdo.

## Validação local da migration 0016 (execução real — NÃO na cloud)

Rodado no stack **Supabase local** (Docker), com remap temporário das portas do
`config.toml` para a janela livre do Windows (revertido depois):

- `supabase start` + `supabase db reset` → **todas** as migrations aplicadas em
  ordem (0001 → **0016**) + seed, **sem erro**.
- CHECK `posts_category_check` = **17 slugs** (15 anteriores preservados +
  `rotinas` + `suporte-tecnico`), nada removido.
- `channel_requires_mod`: `rotinas`=**true**, `suporte-tecnico`=**false**
  (correto: rotinas exige moderador; suporte-técnico é de membro).
- `pnpm db:types` → diff **só de adições esperadas**: tabela
  `community_migration_backup` (0015) + funções `channel_allows_comments`,
  `channel_requires_admin`, `channel_requires_mod` (0014/0016). Tipos usados só na
  RLS/SQL, não no código TS. Os tipos commitados estavam defasados de 0014/0015/0016.
- `typecheck` / `lint` / `build` = **verdes** com os tipos regenerados.
- `config.toml` revertido; stack local parado ao final. **Cloud intocada.**

## Divisão F6 × F6.5 (para commits separados)

Conjuntos de arquivos **disjuntos** — nenhum arquivo precisa de `git add -p`.

- **Fase 6** — `feat(portal): conecta comunidade aos módulos de conteúdo`:
  `apps/page.tsx`, `calendar/page.tsx`,
  `courses/[courseId]/lessons/[lessonId]/page.tsx`, `dashboard/page.tsx`
  (apenas links módulo↔comunidade).
- **Fase 6.5** — `feat(navigation): unifica módulos e canais na sidebar`: todo o
  restante (config única de nav, sidebar/header/mobile/theme, layouts,
  community layout, remoção de `ChannelNav`/`nav-items`, `/agentes`,
  `/support/report`, `structure.ts`, `channel-icon.tsx`, migration `0016`, este
  doc).
- **`src/types/database.generated.ts`** — artefato de tipos que reflete
  0014/0015/0016; recomendado ir **junto da F6.5** (par com a 0016) ou com o
  release. Reflete o schema LOCAL; **não** significa migration aplicada na cloud.

## Branch e release (recomendação — nada executado)

- Commits sugeridos na branch **`feature/community-navigation`** (não criada/trocada
  automaticamente).
- `master` permanece **Production Branch**; a feature branch pode gerar **Vercel
  Preview**.
- **Não** publicar em `master` antes da Fase 7. A **0016** e o código dependente
  (canais `rotinas`/`suporte-tecnico`) devem chegar à produção no **mesmo release
  coordenado** (junto de 0014/0015).

## Fase 7 (congelada) — matriz de testes a atualizar

Ao descongelar, a Fase 7 deve validar a arquitetura FINAL:

- **Navegação**: Início, Comunidade, todos os canais, Cursos e Materiais,
  Biblioteca, Aplicativos, Agentes Especialistas, Calendário de Eventos, Ranking,
  Perguntas Frequentes, Reportar Problema.
- **Sidebar única** (sem painel interno) e **feed ocupando a área útil**.
- **Header**: sino; menu do avatar (perfil, configurações visuais, admin
  condicional, sair); logout real.
- **Papéis**: owner, admin, moderador, membro, banido.
- **Comunidade**: feed geral, canal, detalhe de post, busca, composer, fixados,
  comentários, reações, permissões por canal.
- **Canais pendentes**: Rotinas e Suporte Técnico (navegáveis; publicação só após
  a 0016).
- **Responsividade**: desktop, tablet, mobile — sidebar, drawer, header, títulos
  longos, scroll, active-state.

Pré-requisitos de release (herdados): resolver o **bloqueio de deploy Vercel**
(Hobby/colaborador) e aplicar de forma coordenada as migrations pendentes
(0014 conferir · 0015 remap+CHECK final · **0016** canais novos).
