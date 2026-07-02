# FEATURE 01 — Gestão Contextual por Unidade · Auditoria Técnica (F0)

> Entregável da **Fase F0** (auditoria read-only + plano). Nenhum código, migration ou
> alteração de banco/cloud foi feito nesta fase. Decisões de produto D1/D2 travadas por IAGO.

## 1. Resumo executivo

A Comunidade (reestruturação F0–F7) está estável em produção. A FEATURE 01 adiciona **gestão
contextual**: criar/editar/fixar/mover/excluir conteúdo **dentro da própria unidade** (canal ou
módulo), sem depender do Painel Admin para o dia a dia — que permanece para visão global,
auditoria, filtros e operações em massa. A auditoria conclui **APROVADO PARA INICIAR A F1**:
complexidade **média**, reuso alto (composer configurável, Server Actions e RLS já prontos),
sem abstrações novas. **1 migration certa (0017)** + 1 possível (RLS de módulo).

## 2. Agentes e skills

3 agentes **Explore** (Haiku, read-only): (A) permissões/papéis/RLS/Server Actions; (B)
composer/menus/CTAs/Chat Network; (C) módulos admin (Cursos/Biblioteca/Apps/Calendário) e
forms. Consolidação + revisão adversarial anti-overcoding pelo agente principal. Nenhum agente
escreveu código.

## 3. Metodologia

Baseline por gates read-only + leitura dirigida com evidência `arquivo:linha`. Blocos: baseline,
inconsistências, duplicações, sobreposições, legacy, bugs/tipagem, matriz de permissões, gestão
contextual de canais e módulos, banco/RLS, desempenho, overcoding.

## 4. Baseline

`master` · HEAD `2a7b566` · working tree **limpo** · **typecheck 0 · lint 0 · build 0**.
Fluxos que **não podem regredir**: Feed Geral `/community`; 13 rotas raiz de canal; criar/editar/
excluir/fixar/mover post; comentários/likes/reações/pontos; `/post/[id]`; perfil; owner/admin/
mod/membro/banido; Cursos/Biblioteca/Aplicativos/Calendário/Ranking; Painel Admin; redirects
legados; RLS 3 camadas.

## 5. Inconsistências (respostas às 12 perguntas)

1. Admin cria qualquer post? **Não** — só em canais `publish="admin"` (comece-por-aqui,
   cupons-descontos). Em outros, respeita `canPostInChannel`.
2. Admin edita qualquer post? **Sim** (é moderador por herança — `policies.ts:11-12`, RLS `0014:50`).
3. Admin exclui qualquer post? **Sim** (soft-delete; `posts.ts:86`).
4. Admin fixa qualquer post? **Sim** (`pinPostAction` `isModerator` — `posts.ts:137`).
5. Admin move posts? **Sim** (via `updatePostAction:74` + RLS) — mas **sem UI**.
6. Membro publica nos 5 espaços? **Sim, e além** — hoje publica em ~8 (`publish="member"`).
7. Membro fura canal restrito via API? **Não** — RLS INSERT `WITH CHECK` (`0014:35-40`).
8. Membro move para canal restrito? **Não** — RLS UPDATE `WITH CHECK` (`0014:51-54`).
9. Moderador tem permissões claras? **Sim**, porém globais (sem granularidade por canal).
10. Forms do admin dependem de `/admin`? **Parcial** — vivem em `/admin/*`, mas a lógica é
    client + Server Action (extraíveis).
11. Forms só por redirect? **Cursos** (`course-form-new.tsx:44` redireciona).
12. Ações só no painel global? **Sim** — não há CTA/form contextual nas unidades/módulos.

## 6. Duplicações

Composer único hoje (`post-composer.tsx`) — boa fatoração. Forms de módulo: `ResourceForm`
reutilizável; `AppComposer`/`EventComposer` inline (extrair). **Não** há duplicação prejudicial;
o risco é criar abstração prematura na F4 (evitar). Repetição aceitável: allowlist de canais em
TS + SQL (defesa em profundidade intencional).

## 7. Sobreposições

Painel Admin × páginas contextuais: **conflito potencial** se implementarmos forms/Actions
duplicados → mitigação: **compartilhar** (extrair para `components/*`). UI × Action × RLS =
defesa em profundidade válida (manter).

## 8. Legacy

Nenhuma rota órfã (Agente C). Refs a "Chat e networking": label inconsistente (structure vs nav).
`PostCategory` em `db.ts:26-34` = **obsoleto** (7 slugs antigos). Manter/adaptar: atualizar o
tipo (P2), não remover forms (sem órfãos).

## 9. Bugs e tipagem

- `ProfileLike.role: string` (não `Role`) — `structure.ts:191` (P3).
- `PostCategory` obsoleto/dessincronizado — `db.ts:26-34` (P2).
- `admin/apps/page.tsx` 6+ casts (`select("*")`) (P3).
- `post.category as string` casts pontuais (P3).
Nenhum bug de segurança: RLS cobre INSERT/UPDATE/DELETE/comentário; Server Actions validam papel/
canal/autoria/ban.

## 10–12. Matriz ATUAL → DESEJADA → Diferenças

**Publicação de membro por canal:**

| Canal | publish atual | Membro hoje | DESEJADO (D1) |
|---|---|---|---|
| apresente-se, compartilhe-seu-projeto, vagas-oportunidades, parcerias-colaboracoes | member | ✅ | ✅ (mantém) |
| chat-networking (Feed Geral) | member | ✅ | ✅ (mantém) |
| **marketing-vendas** | member | ✅ | ❌ → moderator |
| **duvidas-gerais** | member | ✅ | ❌ → moderator |
| **suporte-tecnico** | member | ✅ | ❌ → moderator |
| comunicados, lives-encontros, rotinas | moderator | ❌ | ❌ (mantém) |
| comece-por-aqui, cupons-descontos | admin | ❌ | ❌ (mantém) |

**Módulos (criação):**

| Módulo | Atual | DESEJADO (D2) |
|---|---|---|
| Apps | requireAdmin | admin (mantém) |
| Cursos, Recursos, Eventos | requireModerator | **admin** (alinhar) |

**Diferenças/mudanças necessárias:** (D1) `publish` de 3 canais member→moderator + `channel_requires_mod`
(migration 0017); (D2) 3 Server Actions requireModerator→admin + RLS de módulo (verificar).

## 13. Canais — CTA + composer contextual

Um **composer configurável** (`PostComposer` + props `actionLabel`/`placeholder`/`guidance`/
`channelLocked`) serve todos os canais. CTAs por unidade (mapa estático em `structure.ts`):

| Unidade | CTA |
|---|---|
| Comunidade | Criar publicação |
| Comece por aqui | Criar orientação |
| Apresente-se | Criar apresentação |
| Rotinas | Criar rotina |
| Comunicados | Criar comunicado |
| Lives e Encontros | Criar live ou encontro |
| Marketing e Vendas | Criar publicação |
| Vagas e Oportunidades | Criar vaga ou oportunidade |
| Parcerias e Colaborações | Propor parceria |
| Compartilhe seu Projeto | Compartilhar projeto |
| Dúvidas Gerais | Criar tópico |
| Cupons e Descontos | Adicionar benefício |
| Suporte Técnico | Criar tópico de suporte |

## 14. Módulos — gestão contextual

| Módulo | Form atual | Reutilizável? | Server Action | Caminho |
|---|---|---|---|---|
| Recursos | `ResourceForm` | **Sim** | `createResource` (`resources-apps-events.ts:15`) | drawer contextual (baixo) |
| Apps | `AppComposer` (`app-actions.tsx:15`) | extrair | `createApp:77` | extrair form + drawer (médio) |
| Eventos | `EventComposer` (`event-actions.tsx:15`) | extrair | `createEvent:115` | extrair form + drawer (médio) |
| Cursos | `course-form-new` + `CourseEditor` | complexo | `createCourse` (`courses.ts:13`) | subfase própria (alto) |

Reuso em `/admin` **e** contextual, forms compartilhados. Sem componente genérico universal.

## 15. Painel Admin

Mantém visão global/filtros/auditoria/massa/config. Forms/Actions **compartilhados** com o
contexto (fonte única), nunca duplicados.

## 16. Menus de post

Desejado por papel: autor = editar/excluir; moderador = + fixar/desafixar; owner/admin = + mover
de canal. Hoje falta só **"mover de canal"** na UI (backend `updatePostAction:74` + RLS `0014:51-54`
prontos). Delete = soft-delete com confirmação (já existe).

## 17. Banco e RLS

3 camadas OK. **0017** (F2): `channel_requires_mod` += marketing-vendas, duvidas-gerais,
suporte-tecnico (aditiva, idempotente, rollback = versão anterior). **Módulos (D2):** verificar
RLS INSERT de courses/resources/events; migration aditiva só se hoje permitir moderador inserir.
Não aplicar nada na F0.

## 18. Desempenho

Reusar `profile` já carregado (sem fetch por botão/item); permissões no server (RSC); forms sob
demanda (drawer/modal); client isolado; sem provider global/lib nova/query por item.

## 19. Overcoding — proibido

UniversalCrud, FormRegistry, ActionFactory, motor de páginas, CMS, permissões dinâmicas em
tabela, schemas dinâmicos, modal universal, hook genérico de CRUD, wrappers de 1 linha.
Proporcional: 1 composer configurável + forms específicos reusados + helpers pequenos +
componentes com ≥2 consumidores reais.

## 20. Roadmap F0–F6

F0 auditoria (esta) · F1 contrato/matriz (sem código) · F2 canais (composer + CTA + D1 + 0017) ·
F3 moderação contextual (menu + mover) · F4 módulos (Recursos→Apps→Eventos→Cursos + D2) ·
F5 Chat Network (doc + backlog FEATURE 02) · F6 QA & release. Cada fase: gates + testes +
segurança + performance + aprovação explícita. Nunca auto-avança.

## 21. Matriz de arquivos (esperada)

| Fase | Principais | Migration |
|---|---|---|
| F2 | `post-composer.tsx`, `community-feed.tsx`, `structure.ts` | 0017 |
| F3 | `post-card.tsx`, reuso `posts.ts` | — |
| F4 | `components/{apps,calendar,courses,resources}/*-form.tsx`, `/admin/*`, contextuais, `resources-apps-events.ts`/`courses.ts` | 0018? (RLS módulo) |
| F5 | docs (+ label) | — |

## 22. Matriz de migrations

| # | Fase | Tipo | Reversível por |
|---|---|---|---|
| 0017 | F2 | `channel_requires_mod` += 3 slugs (D1) | recriar função anterior |
| 0018? | F4 | RLS INSERT módulos → admin (D2), se necessário | recriar policy anterior |

## 23. Riscos

Regressão de publicação (D1) → config + migration aditiva + testes por papel. Duplicação Admin×
contextual → forms/Actions compartilhados. Overcoding → guarda + revisão adversarial por fase.

## 24. Rollback

F2/F3/F4 por `git revert`; migrations por recriação idempotente da versão anterior; RLS módulo
por recriar policy prévia. Sem alteração de dados.

## 25. Critérios de aceite (por fase futura)

Gates verdes; permissões corretas por papel em UI+Action+RLS; bypass PostgREST barrado; mobile;
sem regressão dos 22 fluxos-baseline; sem overcoding; aprovação humana.

## 26. Recomendação final

**APROVADO PARA INICIAR A F1.** D1 (membro em 5 canais) e D2 (módulos admin-only) travadas.
Complexidade média, reuso alto, 1 migration certa (0017) + 1 possível. Sem bloqueios técnicos.
