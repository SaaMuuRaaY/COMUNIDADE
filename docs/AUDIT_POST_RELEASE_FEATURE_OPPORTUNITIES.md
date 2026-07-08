# AUDITORIA PÓS-RELEASE — OPORTUNIDADES DE FEATURES

**Data:** 2026-07-08 · Derivado da baseline real (código/migrations), não de wishlist genérica.

## Princípio

Toda oportunidade abaixo **reutiliza infraestrutura já existente e verificada** (notifications, points_ledger, saved_posts, lesson_progress, chat_messages.room, RLS vigente). Nenhuma exige Redis, filas, cron ou serviços novos.

---

## TOP 10 CANDIDATAS (detalhadas)

### F-01 · Menções @username + notificação de resposta
- **Problema:** membro não descobre quando é citado ou respondido → conversas morrem.
- **Beneficiado:** membro (engajamento) e admin (retenção).
- **Valor:** alto · **Urgência:** alta (maior alavanca de engajamento disponível).
- **Dependências:** tabela `notifications` + triggers (0008/0022) já existem; parser de `@` no composer/comentários.
- **Impacto técnico:** M — parser + trigger/action de notificação + autocomplete de username. Banco: 0 tabelas novas (usa `notifications.reference_type`). RLS: nenhuma mudança. Realtime: opcional (badge já existe).
- **Dificuldade:** Média · **Risco:** baixo · **Esforço:** M.
- **MVP:** menção em posts/comentários notifica; autocomplete simples. **Evolução:** menções no chat/DM, preferências de notificação.
- **Critério de sucesso:** ≥30% das menções geram resposta em 48h.
- **Fazer agora?** Sim — melhor razão valor/esforço do ciclo. **Contra:** nenhum relevante.

### F-02 · Busca global
- **Problema:** conteúdo (posts, cursos, recursos, membros) só é achável navegando.
- **Valor:** alto · **Urgência:** média-alta.
- **Dependências:** `getFeedPosts` já tem busca por texto; falta unificar (posts + courses + resources/apps + profiles).
- **Impacto:** M — página `/busca` + queries `ilike`/`tsvector`. Banco: índices GIN opcionais (migration aditiva). RLS: reutiliza policies de leitura existentes.
- **Dificuldade:** Média · **Risco:** baixo · **Esforço:** M.
- **MVP:** busca por título/nome em 4 domínios com abas. **Evolução:** full-text português (tsvector), ranking de relevância.
- **Critério de sucesso:** busca usada em ≥20% das sessões.
- **Contra agora:** nenhum técnico; competir por prioridade com F-01.

### F-03 · Marcação de solução ("melhor resposta")
- **Problema:** em `duvidas-gerais`/`suporte-tecnico`, quem chega depois não sabe qual resposta resolveu.
- **Valor:** alto para canais de suporte · **Urgência:** média.
- **Dependências:** `post_comments` existe; 1 coluna `is_solution` (migration aditiva) + policy (autor do post ou mod).
- **Impacto:** P/M. Pontos: conceder pontos ao autor da solução via `award_points` (idempotente por reference).
- **Dificuldade:** Baixa · **Risco:** baixo · **Esforço:** P.
- **MVP:** marcar/desmarcar + destaque visual + badge no feed. **Evolução:** filtro "resolvidos", reputação de solucionador.
- **Critério de sucesso:** ≥50% das dúvidas marcadas como resolvidas em 7 dias.

### F-04 · "Continuar assistindo" no dashboard
- **Problema:** `lesson_progress` já registra progresso, mas o membro não tem atalho de retomada.
- **Valor:** alto (retenção de cursos) · **Urgência:** média.
- **Dependências:** zero — query sobre `lesson_progress` + card no dashboard.
- **Impacto:** P. Banco/RLS: nenhum.
- **Dificuldade:** Baixa · **Risco:** mínimo · **Esforço:** P (quick win).
- **MVP:** card "continue de onde parou" com última aula incompleta. **Evolução:** % de progresso por curso na listagem.
- **Critério de sucesso:** aumento de conclusão de aulas por sessão.

### F-05 · Favoritos na Biblioteca
- **Problema:** membro não consegue guardar recursos/apps (posts já têm `saved_posts`).
- **Valor:** médio-alto · **Urgência:** média.
- **Dependências:** replicar padrão `saved_posts` → `saved_resources` (migration aditiva pequena, RLS own-only idêntica).
- **Impacto:** P/M. Storage/Realtime: nenhum.
- **Dificuldade:** Baixa · **Risco:** baixo · **Esforço:** P.
- **MVP:** coração no card + aba em /salvos. **Evolução:** coleções nomeadas.

### F-06 · Extrato de pontos ("Meus pontos")
- **Problema:** membro vê total/ranking mas não o histórico — gera desconfiança na gamificação.
- **Dependências:** **zero** — RLS de `points_ledger` já permite SELECT own; só falta a página.
- **Impacto:** P. Banco: nenhum.
- **Dificuldade:** Baixa · **Risco:** mínimo · **Esforço:** P (quick win puro).
- **MVP:** lista paginada de lançamentos (ação, pontos, data) em /profile ou /rewards. **Evolução:** gráfico mensal.
- **Critério de sucesso:** queda de questionamentos sobre pontos; acesso recorrente à página.

### F-07 · Badges/conquistas
- **Problema:** progressão além de pontos/nível é invisível; pontos sozinhos saturam.
- **Dependências:** `points_ledger` (fonte de eventos) + `levels`; nova tabela `badges` + `user_badges` (aditiva).
- **Impacto:** M — definição de regras (1º post, 10 comentários, streak de login…), concessão via trigger ou verificação on-login.
- **Dificuldade:** Média · **Risco:** médio (regras mal calibradas geram ruído) · **Esforço:** M.
- **MVP:** 6–8 badges automáticas + exibição no perfil. **Evolução:** missões/campanhas sazonais.

### F-08 · Eventos: exportar .ics + lembrete
- **Problema:** membro esquece eventos; não integra com agenda pessoal.
- **Dependências:** `events` + `event_attendees` existem. `.ics` é geração de arquivo server-side sem dependência nova. Lembrete: notificação on-login ("evento em 24h") — **sem cron**.
- **Impacto:** P/M. Banco: nenhum (lembrete on-login) — RLS inalterada.
- **Dificuldade:** Baixa · **Risco:** baixo · **Esforço:** P (.ics) + M (lembrete).
- **MVP:** botão "adicionar à agenda" (.ics). **Evolução:** lembrete por notificação, recorrência.

### F-09 · Salas múltiplas no Chat Network
- **Problema:** 1 sala única mistura assuntos; `chat_messages.room` **já existe no schema** (0019) e só é usado com um valor.
- **Dependências:** UI de seleção de sala + constante de salas permitidas; RLS atual já filtra por room via policy existente (verificar CHECK).
- **Impacto:** M — zero migrations se a coluna aceitar novos valores; possível CHECK a ampliar (aditivo).
- **Dificuldade:** Média · **Risco:** médio (moderação em N salas) · **Esforço:** M.
- **MVP:** 2–3 salas temáticas. **Evolução:** presença online (Supabase Presence), anexos.

### F-10 · Analytics para administração
- **Problema:** admin não vê atividade agregada (posts/semana, membros ativos, cliques na biblioteca — `click_count` já coletado).
- **Dependências:** dados já existentes (posts, points_ledger, click_count, event_attendees); RPCs de agregação read-only (aditivas).
- **Impacto:** M. Sem novas tabelas.
- **Dificuldade:** Média · **Risco:** baixo · **Esforço:** M.
- **MVP:** /admin com 6–8 métricas e tendência semanal. **Evolução:** retenção/cohorts, export CSV.

---

## Demais oportunidades (avaliação resumida)

| Feature | Valor | Esforço | Dificuldade | Prioridade | Observação |
|---|---|---|---|---|---|
| Threads/respostas aninhadas em comentários | Médio | M | Média | P2 | `parent_id` já existe no schema; falta UI |
| Enquetes em posts | Médio | M | Média | P3 | nova tabela + votos |
| Anotações em aulas | Médio | M | Média | P3 | nova tabela own-only |
| Certificados de curso | Médio | M/G | Média | P3 | depende de conclusão confiável |
| Presença online no chat | Médio | M | Média | P3 | Supabase Presence |
| Anexos no chat/DM | Médio | G | Alta | P3 | moderação + storage |
| Conteúdo agendado (comunicados) | Médio | M | Média | P3 | precisa gatilho de publicação |
| Operações em massa no admin | Médio | M | Média | P3 | |
| Denúncia de posts/comentários (além de DM) | Alto | M | Média | P2 | `dm_reports` como referência |
| Streaks de participação | Médio | M | Média | P3 | pós-badges |
| Planos/área VIP (acesso por produto) | Alto (receita) | GG | Muito alta | P3/estratégico | 1ª feature de monetização; exige pagamento + gating |
| Cupons/benefícios estruturados | Médio | M | Média | P3 | canal já existe |
| Recomendações de conteúdo | Médio | G | Alta | Não fazer agora | sem massa de dados ainda |

**Descartadas por ora (anti-overcoding):** motor de recomendação, analytics próprio completo, workflow engine, permissões dinâmicas, CMS universal — sem evidência de necessidade na base atual.

---

## MATRIZ DE PRIORIZAÇÃO (obrigatória)

| # | Feature | Problema | Valor | Urgência | Dificuldade | Risco | Dependências | Esforço | Ordem |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | Menções + resposta | Descoberta de interação | Alto | Alta | Média | Baixo | notifications (pronta) | M | 1 |
| F-06 | Extrato de pontos | Transparência gamificação | Médio-alto | Média | Baixa | Mínimo | nenhuma | P | 2 |
| F-04 | Continuar assistindo | Retenção cursos | Alto | Média | Baixa | Mínimo | nenhuma | P | 3 |
| F-05 | Favoritos Biblioteca | Guardar conteúdo | Médio-alto | Média | Baixa | Baixo | padrão saved_posts | P | 4 |
| F-03 | Melhor resposta | Dúvidas sem fechamento | Alto | Média | Baixa | Baixo | 1 coluna aditiva | P | 5 |
| F-08 | .ics + lembrete | Presença em eventos | Médio | Média | Baixa | Baixo | events (pronta) | P/M | 6 |
| F-02 | Busca global | Conteúdo inachável | Alto | Média-alta | Média | Baixo | índices opcionais | M | 7 |
| F-07 | Badges | Progressão visível | Médio-alto | Média | Média | Médio | ledger (pronta) | M | 8 |
| F-09 | Salas de chat | Assuntos misturados | Médio | Baixa | Média | Médio | coluna room (pronta) | M | 9 |
| F-10 | Analytics admin | Gestão às cegas | Médio | Baixa | Média | Baixo | dados prontos | M | 10 |

Critérios aplicados: valor p/ membro e administração, retenção, engajamento, receita, segurança, complexidade, dependências, risco de regressão, custo de manutenção.

**Top 5 priorizadas:** F-01 Menções · F-06 Extrato de pontos · F-04 Continuar assistindo · F-05 Favoritos Biblioteca · F-03 Melhor resposta.

**Primeira próxima feature recomendada:** **F-01 Menções @ + notificação de resposta** — maior alavanca de engajamento, infraestrutura de notificações pronta, zero migration destrutiva, risco baixo.

---

*Áreas de investigação avaliadas: conteúdo/aprendizagem, comunidade, chat, eventos, biblioteca, gamificação, administração e negócio — conforme escopo da auditoria. Nenhuma implementação foi iniciada.*
