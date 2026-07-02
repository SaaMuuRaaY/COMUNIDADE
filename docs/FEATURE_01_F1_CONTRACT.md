# FEATURE 01 — F1 · Contrato & Matriz (sem código)

> Deliverable da **Fase F1**. Formaliza a matriz final (D1/D2 travadas), CTAs/labels/guidance,
> permissões de moderador, e o plano exato de migrations. **Nenhum código nesta fase.**
> Ao aprovar, inicia-se a **F2** (primeira fase com código).

## 1. Matriz FINAL de publicação em canais (D1 travada)

| Canal | slug | publish FINAL | Membro | Moderador | Admin |
|---|---|---|---|---|---|
| Apresente-se | apresente-se | member | ✅ | ✅ | ✅ |
| Compartilhe seu Projeto | compartilhe-seu-projeto | member | ✅ | ✅ | ✅ |
| Vagas e Oportunidades | vagas-oportunidades | member | ✅ | ✅ | ✅ |
| Parcerias e Colaborações | parcerias-colaboracoes | member | ✅ | ✅ | ✅ |
| Chat/Comunidade (Feed Geral) | chat-networking | member | ✅ | ✅ | ✅ |
| **Marketing e Vendas** | marketing-vendas | **moderator** ⬆ | ❌ | ✅ | ✅ |
| **Dúvidas Gerais** | duvidas-gerais | **moderator** ⬆ | ❌ | ✅ | ✅ |
| **Suporte Técnico** | suporte-tecnico | **moderator** ⬆ | ❌ | ✅ | ✅ |
| Comunicados | comunicados | moderator | ❌ | ✅ | ✅ |
| Lives e Encontros | lives-encontros | moderator | ❌ | ✅ | ✅ |
| Rotinas | rotinas | moderator | ❌ | ✅ | ✅ |
| Comece por aqui | comece-por-aqui | admin | ❌ | ❌ | ✅ |
| Cupons e Descontos | cupons-descontos | admin | ❌ | ❌ | ✅ |

⬆ = mudança nesta feature (member→moderator). **Nota futura (não implementar):** reabrir
Marketing/Dúvidas/Suporte a membros é decisão posterior separada.

## 2. Matriz FINAL de ações no post

| Ação | Autor | Moderador | Admin/Owner | Imposição |
|---|---|---|---|---|
| Editar (título/body) | ✅ (próprio) | ✅ (qualquer) | ✅ | Action + RLS UPDATE |
| **Mover de canal** | ❌ | ✅ | ✅ | Action (`canPostInChannel` destino) + RLS `WITH CHECK` |
| Fixar/Desafixar | ❌ | ✅ | ✅ | Action `isModerator` |
| Excluir (soft) | ✅ (próprio) | ✅ | ✅ | Action + RLS DELETE |
| Comentar/Reagir | ✅ | ✅ | ✅ | `canCommentInChannel` + ban |

Novidade da UI (F3): **"Mover de canal"** no editor, só admin/mod. Backend/RLS já prontos.

## 3. Matriz FINAL de módulos (D2 travada — admin-only)

| Módulo | Criar/Editar/Excluir | RSVP/Progresso/Comentar |
|---|---|---|
| Cursos (+ módulos/aulas) | **admin** ⬆ | membro (progresso/comentário de aula) |
| Biblioteca (Recursos) | **admin** ⬆ | membro (ver/baixar) |
| Aplicativos | admin (já) | membro (ver/usar) |
| Calendário (Eventos) | **admin** ⬆ | membro (RSVP) |

⬆ = mudança (moderator→admin). Interações de membro (progresso, comentário de aula, RSVP)
permanecem inalteradas.

## 4. Permissões FINAIS do moderador (confirmadas)

- ✅ Moderar posts/comentários (editar/excluir qualquer; fixar/mover).
- ✅ Publicar em canais `publish=moderator` (comunicados, lives, rotinas, marketing, dúvidas, suporte).
- ❌ Criar/editar cursos, recursos, aplicativos, eventos (admin-only).
- ❌ Alterar configurações globais / acessar `/admin` (só admin — proxy).
- Moderador **≠** admin (sem escalada silenciosa).

## 5. CTAs / labels / guidance por unidade (composer contextual)

`PostComposer` ganha props opcionais `actionLabel`, `placeholder`, `guidance`, `channelLocked`.
Mapa estático em `structure.ts` (não CMS):

| Unidade | actionLabel | guidance (curto) |
|---|---|---|
| Comunidade | Criar publicação | Compartilhe com toda a comunidade. |
| Comece por aqui | Criar orientação | Onboarding/primeiros passos (equipe). |
| Apresente-se | Criar apresentação | Conte quem você é. |
| Rotinas | Criar rotina | Desafio/ritual/check-in (equipe). |
| Comunicados | Criar comunicado | Anúncio oficial (equipe). |
| Lives e Encontros | Criar live ou encontro | Aviso/link do encontro (equipe). |
| Marketing e Vendas | Criar publicação | (equipe) |
| Vagas e Oportunidades | Criar vaga ou oportunidade | Descreva a vaga. |
| Parcerias e Colaborações | Propor parceria | O que você busca/oferece. |
| Compartilhe seu Projeto | Compartilhar projeto | Mostre o que está construindo. |
| Dúvidas Gerais | Criar tópico | (equipe) |
| Cupons e Descontos | Adicionar benefício | Benefício/cupom (admin). |
| Suporte Técnico | Criar tópico de suporte | (equipe) |

`channelLocked` = true quando o usuário não pode publicar (mostra aviso "canal da equipe"),
em vez do composer.

## 6. Contrato de gestão contextual dos módulos

Cada módulo admin ganha um CTA "Criar/Adicionar X" **na própria página** (`/courses`,`/resources`,
`/apps`,`/calendar`), visível só p/ admin, abrindo um **drawer/modal** que reusa o form extraído
(`components/{módulo}/*-form.tsx`) — o **mesmo** usado em `/admin`. Server Action única por
operação (compartilhada). Sem duplicação, sem componente universal.

## 7. Policies / migrations necessárias

- **0017 (F2, D1):** `create or replace function public.channel_requires_mod(slug text)` incluindo
  `marketing-vendas`, `duvidas-gerais`, `suporte-tecnico` (além dos atuais). Aditiva/idempotente.
  Rollback = versão anterior (6 slugs). Também: `structure.ts` `publish` desses 3 → `moderator`.
- **0018 (F4, D2):** recriar `courses_mod_write`, `modules_mod_write`, `lessons_mod_write`,
  `resources_mod_write`, `events_mod_write` com `is_admin()` (hoje `is_moderator()` em
  `0006:131-252`). `apps_admin_write` inalterada. Server Actions `createCourse`/`createResource`/
  `createEvent` (+ update/delete de módulo) `requireModerator`→`requireAdmin`. Interações de membro
  (progress/lesson_comments/attendees) inalteradas. Rollback = recriar policies `is_moderator`.
- **Validação:** ambas no stack local (Docker + remap de portas) antes de qualquer cloud;
  `pnpm db:types` conferido. **Não** aplicar na cloud sem aprovação (IAGO aplica).

## 8. Critérios de aceite da F1

Matriz final travada (D1/D2) ✅; CTAs/labels/guidance definidos ✅; permissões de moderador
confirmadas ✅; contrato de módulos definido ✅; plano de migrations 0017/0018 com nomes exatos de
policy ✅. Sem código/migration/cloud nesta fase ✅.

## 9. Próximo passo

Aprovar → iniciar **F2** (Canais): estender `PostComposer` (props), CTA/guidance por unidade em
`community-feed.tsx`, aplicar D1 (`structure.ts` + migration 0017 validada local). Gate + testes
por papel + aprovação antes da F3.
