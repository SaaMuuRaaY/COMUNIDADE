# AUDITORIA PÓS-RELEASE — TÉCNICA (consolidada e verificada adversarialmente)

**Data:** 2026-07-08 · HEAD `fea4992` · Gates: typecheck ✅ lint ✅ build ✅
**Método:** 7 agentes especialistas + consolidação + revisão adversarial que CONFIRMOU/REFUTOU cada achado no código real. Só entram aqui achados com evidência.

## 0. Regressões

**Nenhuma regressão encontrada.** Gates verdes sobre o HEAD; fluxos pré-existentes (auth, feed, cursos, admin) inalterados na leitura estática; nenhuma migration recente altera comportamento anterior de forma destrutiva. (E2E não executado por regra da auditoria — bater no Supabase cloud alteraria dados reais.)

## 1. Achados confirmados (deduplicados)

### Observabilidade — P1

| ID | Achado | Evidência | Correção mínima | Esforço |
|---|---|---|---|---|
| OBS-01 | Error boundaries não reportam ao Sentry — todas fazem só `console.error` | `src/app/(app)/error.tsx:14`, `(auth)/error.tsx`, `admin/error.tsx`, `global-error.tsx:14` | `Sentry.captureException(error)` em cada boundary | P |
| OBS-02 | Erros **tratados** em server actions (catch → `{ok:false}`) nunca chegam ao Sentry; `onRequestError` (instrumentation.ts:14) só captura não-tratados | 8 `console.error` em `src/server/actions/{posts,connections,resources-apps-events}.ts` | `Sentry.captureException` nos catches relevantes (com tag da action) | P |

### Bugs — P2

| ID | Achado | Evidência | Correção mínima | Esforço |
|---|---|---|---|---|
| BUG-01 | UPDATE de `dm_conversations` (last_message_at/last_read) sem verificação de erro — INSERT da mensagem verifica, o UPDATE não; falha silenciosa dessincroniza inbox/badge | `src/server/actions/direct-messages.ts:109` | checar `error` e reportar | P |
| BUG-02 | `getCommentsByPost` sem `.limit()` nem paginação (única query de lista sem limite; feed=30, chat=50, DM=50) | `src/server/queries/posts.ts:196-203` + consumidor `post/[postId]/page.tsx` | limit + "carregar mais" | M |

### Performance — P2 (nenhum crítico)

| ID | Achado | Evidência | Correção mínima | Esforço |
|---|---|---|---|---|
| PERF-01 | `enrichPosts()` traz linhas cruas de likes/comments/saved dos 30 posts e conta em JS (volume proporcional ao feed, não à tabela — confirmado; ainda assim é o caminho mais quente: feed, salvos, dashboard, perfil) | `src/server/queries/posts.ts:37-111` | agregação `GROUP BY` (RPC ou view) | M |
| PERF-02 | Cascata de 3 round-trips em `getLessonForViewer` | `src/server/queries/courses.ts:79-121` | consolidar em Promise.all + validação no app | P |
| PERF-03 | Perfil de membro: 3 fases sequenciais de Promise.all + `select("*")` em profiles | `src/app/(app)/members/[userId]/page.tsx:35-67` | 1 Promise.all + select explícito | P |
| PERF-05 | 6 `<img>` sem `next/image` | `post-card.tsx:289`, `post-image-field.tsx:55`, `cover-uploader.tsx:45`, `resource-browser.tsx:84`, `library-item-content.tsx:28`, `public-item-preview.tsx:21` | trocar por `next/image` onde fizer sentido (uploader pode manter) | P |
| PERF-07 | Layout `(app)` roda 3 contagens (DM/notificações/conexões) a cada navegação, sem cache | `src/app/(app)/layout.tsx:13-17` | RPC única `get_user_summary` ou cache curto | M |

**Já otimizado (não mexer):** trending e ranking mensal usam `unstable_cache` (120s/180s); paginação presente em feed/chat/DM/notificações; Realtime com cleanup correto (`removeChannel`); double-submit protegido por refs.

**Otimizações desnecessárias agora:** Redis, virtualização de listas, infinite scroll do feed, edge rendering, background jobs.

### UX / Acessibilidade — P2

| ID | Achado | Evidência | Correção mínima | Esforço |
|---|---|---|---|---|
| UX-01 | Inputs de comentário/chat/DM/post só com placeholder (sem `aria-label`/Label) — WCAG 1.3.1 | `comment-list.tsx:80`, `chat-room.tsx:233`, `dm-thread.tsx:346`, `post-composer.tsx:78-96` | `aria-label` em ~10 campos | P |
| UX-02 | Botão curtir sem `aria-label`/`aria-pressed` (anuncia "button 42") | `post-card.tsx:309-318` | aria-label dinâmico | P |
| UX-03 | Botões editar/apagar mensagem `opacity-0 group-hover` sem `focus-visible:opacity-100` — invisíveis via teclado | `chat-room.tsx:199`, `dm-thread.tsx:299` | adicionar classe focus-visible | P |
| UX-04 | Touch targets do mobile-nav abaixo de 44px (`py-1`, `text-[10px]`) — WCAG 2.5.8 | `mobile-nav.tsx:24-29` | `min-h-11`/`py-2` em mobile | P |
| UX-05 | Chat/DM em mobile: container `h-[calc(100vh-11rem)]` pode deixar o input encoberto pelo teclado virtual (PARCIAL — depende do viewport dinâmico) | `chat-room.tsx:137`, `dm-thread.tsx` | `dvh`/safe-area + testar em dispositivo real | M |
| UX-06 | Banir membro executa direto, sem dialog de confirmação (padrão `ConfirmDialog` já existe no projeto) | `src/app/admin/members/member-row.tsx:50-59` | reutilizar ConfirmDialog | P |
| UX-07 | Validação de forms de auth/perfil mostra erro em toast sem foco/erro inline no campo (INFERIDO) | `login-form.tsx`, `profile-form.tsx` etc. | erro inline + focus no 1º campo | M |

**Bem feito (confirmado):** Radix cobre dialogs/menus; `SheetTitle`/`DialogTitle` presentes (fix 3b08e24); `aria-current` no nav; skeletons e empty states consistentes — inclusive em admin/courses e admin/events; confirmação de exclusão em posts/comentários; foco visível em botões.

### Banco (hardening, sem crítico) — P2/P3

| ID | Achado | Evidência | Correção mínima | Esforço |
|---|---|---|---|---|
| ~~DB-01~~ | **FALSO POSITIVO (corrigido na execução do Bloco 0):** todas as funções SECURITY DEFINER JÁ têm `set search_path = public` (verificado por grep em todas as 35 migrations em 2026-07-08) — nenhuma migration necessária | 0001/0005/0008/0009/0021/0022/0026/0032/0033/0035 | nenhuma | — |
| DB-02 | `lesson_progress.completed_at` sem sincronização com `completed` (CHECK ausente) | 0003:71 | CHECK ou trigger | P |
| DB-03 | `lessons` sem unique de slug por curso (courses tem) | 0003:17 | unique aditiva se slug de lesson for usado em URL | P |
| DB-04 | `post_comments.parent_id` permite ciclo teórico | 0002:36 | trigger de guarda (baixa prioridade) | P |
| DB-05 | Índice composto `(created_at, user_id)` em points_ledger seria mais eficiente p/ ranking — **não é full scan** (btree em created_at atende o range; REFUTADO como problema) | 0033:45 | opcional | P |
| DB-06 | `community_migration_backup` sem política de retenção | 0015/0035 | definir retenção futura | P |
| DB-07 | Alterações em `settings` por admin sem trilha de auditoria (hardening, não vulnerabilidade) | 0006:303-314 | log futuro | M |

### Tipagem

**Nenhum achado relevante.** Sem `any`/`@ts-ignore` significativos; zod em todas as actions; tipos gerados sincronizados com as 35 migrations; roles/slugs com CHECKs no banco e unions no app.

### Duplicações / Sobreposições / Legacy

Nenhuma duplicação prejudicial. Detalhe e vereditos em `AUDIT_POST_RELEASE_ARCHITECTURE.md` (uploader/forms = repetição aceitável; guards multicamada = defesa em profundidade; canais legados = transição documentada; nenhum órfão).

## 2. Falsos positivos eliminados na revisão adversarial

| Alegação (origem) | Veredito | Evidência |
|---|---|---|
| "award_points executável por authenticated" (docs antigos) | **RESOLVIDO** em 0031:15-18 (REVOKE + GRANT service_role) | SQL |
| "Aulas draft legíveis por qualquer membro" | **RESOLVIDO** em 0010:11-36 | SQL |
| "Soft-delete não estorna pontos" | **RESOLVIDO** em 0032:63-98 (triggers) | SQL |
| "Sem governança de pontos" | **RESOLVIDO** em 0032:29-52 (`admin_adjust_points` c/ motivo) | SQL |
| "Rate-limit sem fallback" | **FALSO** — fallback em memória em rate-limit.ts:85-89 | código |
| "Trocar lookup da biblioteca por `.or(slug,id)`" | **FIX REFUTADO** — quebraria cast de uuid; código atual correto | código |
| "Índice do ranking causa full scan" | **EXAGERO** — btree em created_at atende range scan | SQL |
| "Empty state ausente em admin/courses e admin/events" | **FALSO** — ambos têm EmptyState | código |
| "Upload sem validação de MIME/tamanho" | **FALSO** — validado em use-image-upload.ts:24-30 | código |

Lição registrada: relatórios de auditorias anteriores em `docs/` descrevem problemas **já corrigidos** — sempre validar contra migrations/código atual.

## 3. Testes e cobertura

> **Atualizado em 2026-07-08 (execução do Bloco 0).** A suíte foi finalmente **executada** (a auditoria não a rodou por não tocar dados reais). Resultado inicial: **9 de 52 testes falhando**. Diagnóstico:
>
> | Causa | Testes | Natureza |
> |---|---|---|
> | Specs obsoletos desde a **FEATURE 02** — clicavam no composer de `/community` (Feed Geral virou view-only; publicar migrou para os canais), usavam o placeholder de busca antigo e um filtro por categoria extinto | 5 | **Dívida de teste pré-existente** |
> | Spec obsoleto desde `canManageMember()` — esperava toast de anti-lockout, mas a UI já **não expõe** controles do próprio admin (`Sem permissão`) | 1 | **Dívida de teste pré-existente** |
> | Ban agora exige `ConfirmDialog` (mudança do Bloco 0) | 2 | Ajuste legítimo de teste |
> | Testes novos com corrida: asserção do estado **otimista** seguida de navegação, abortando o POST da server action em voo | 2 | Bug dos testes novos |
>
> **Nenhuma dessas falhas era bug de produto.** Também corrigido: `supabase.auth.signOut()` tem escopo **global** e invalidava o `storageState` do projeto `[admin]` (13 falhas em cascata) — passou a usar `{ scope: "local" }`.
>
> Achado de produto que emergiu: o botão de curtir permanece `disabled` durante o `revalidatePath` do feed inteiro (sintoma de **PERF-01**); o teste passou a asserir `aria-pressed` — observável graças ao próprio lote de a11y.
>
> **Lição:** uma suíte E2E que nunca roda não é cobertura, é decoração. Recomendação: rodar `pnpm test:e2e` em cada fase (gate padrão) contra ambiente de teste.

**Inventário (após o Bloco 0):** 9 specs Playwright (**56 testes**) + fixtures/setup; 0 testes unitários; **6 testes diretos de RLS/RPC** (`rls.spec.ts`).

| Fluxo | Teste atual | Cobertura | Risco | Teste recomendado |
|---|---|---|---|---|
| Auth (login/logout/registro) | E2E | Média | Baixo | recuperação de senha |
| Perfil (edição) | E2E | Média | Baixo | upload de avatar |
| Feed/posts/comentários/reações | E2E | Alta | Baixo | — |
| Cursos/aulas (admin cria) | E2E | Média | Médio | progresso do aluno |
| Biblioteca (criar app) | E2E | Baixa | Médio | slug/deep-link/preview público |
| Chat realtime | **E2E (novo)** | Média | Médio | envio+persistência cobertos; **entrega via Realtime segue manual** |
| DMs | **E2E (novo)** | Média | Médio | bloqueio/denúncia ainda manual |
| Salvos | **E2E (novo)** | Média | Baixo | — |
| Conexões / Notificações | **nenhum** | Nenhuma | Médio | smoke por painel |
| Onboarding + acordos | **E2E (novo)** | Média | Baixo | — |
| Biblioteca deep-link | **E2E (novo)** | Média | Baixo | preview público ainda manual |
| Leaderboard / Rewards | smoke de rota | Baixa | Médio | ranking + emissão manual |
| Admin (membros/ban) | E2E | Média | Médio | operações contextuais |
| RLS adversarial | **E2E (novo)** | Média | Baixo | draft lesson, DM de terceiro, `award_points`, banido, anti-lockout por RPC |

**Fluxos críticos que ainda dependem só de teste manual:** entrega Realtime na sessão (chat/DM), bloqueio/denúncia de DM, preview público da Biblioteca, emissão de recompensas, painéis de conexões/notificações.

## 4. Documentação

| Doc | Status |
|---|---|
| PROJETO.md, AUDITORIA_BASELINE.md, NEW_FEATURES_MASTER_* | Histórico OK (marcar como histórico para não confundir — vide falsos positivos acima) |
| PLAYBOOK.md | **DESATUALIZADO** (diz "sem testes"; 24 existem) |
| PRODUCAO.md | **DESATUALIZADO** (checklist já atendido em partes) |
| SUPABASE_TYPE_SAFETY.md | **DESATUALIZADO** (menciona stub substituído por `pnpm db:types`) |
| `.env.example` | **AUSENTE** — criar (nomes sem valores) |
| README.md | Atual (revisar menção a MVP/beta) |
| Rollback/troubleshooting | **AUSENTE** como doc dedicado |

---

*Nenhuma correção foi aplicada. Priorizações e fases em `AUDIT_POST_RELEASE_ROADMAP.md`.*
