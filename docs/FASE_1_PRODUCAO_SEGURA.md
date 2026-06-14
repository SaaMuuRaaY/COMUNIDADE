# FASE 1 — Produção Segura (CODEX Community / Portal Nexus)

> Execução dos bloqueadores críticos da `docs/AUDITORIA_BASELINE.md` **antes** de UX/UI, conteúdo, monetização ou features.
> **Data:** 2026-06-14. **Deploy oficial:** Vercel (GitHub → Vercel; GitHub Desktop só commit/push). **Backend:** Supabase (Auth/DB/Storage). Docker/Hetzner = legado (ver §7).

## Premissa operacional confirmada
- Repositório Git conectado ao **Vercel** (build zero-config Next.js; **não há `vercel.json`** — normal).
- `Dockerfile` / `docker-compose.yml` / `Caddyfile` / `.github/workflows/deploy.yml` = setup self-hosted **Hetzner paralelo**, tratado como **legado provável** (não removido nesta fase).

---

## O que JÁ foi aplicado no código (este commit)
Arquivos de migration e código alterados/criados (detalhe no relatório final):
- `supabase/migrations/0009_profile_security_and_owner.sql` — SEC-01 + SEC-05 + owner.
- `supabase/migrations/0010_course_content_rls.sql` — SEC-03.
- Código: `admin.ts` (RPCs), `queries/courses.ts` + `actions/courses.ts` (gating draft), `policies.ts` / `current-user.ts` / `types/db.ts` (owner), `member-row.tsx` / `members/page.tsx` (badge+bloqueio), `cookie-consent.tsx` (lint), `.gitignore` (vercel.txt).

## O que ainda é MANUAL (não dá para fazer por código)
1. **Backup** do banco (§1).
2. **Aplicar as migrations 0009/0010 no Supabase cloud** (§5) — SQL Editor (service_role não roda DDL via API).
3. **SEC-02** — verificar/neutralizar usuários demo (§2), só após backup e confirmação do admin/owner real.
4. **Marcar o owner** (§3).
5. **SEC-04** — configurar Auth no Dashboard Supabase (§6).
6. **Vercel** — conferir env vars/domínio/branch (§7).

---

## §1 — Backup OBRIGATÓRIO (antes de qualquer SQL)
- [ ] Supabase Dashboard → **Database → Backups** → confirmar backup recente (ou criar). Plano Free: usar `pg_dump`/`scripts/backup.sh`.
- [ ] Exportar especificamente a tabela de perfis (rede de segurança):
```sql
-- rode no SQL Editor e salve o resultado:
select id, full_name, username, role, is_banned, is_owner, points, level, created_at
from public.profiles order by created_at;
```
- [ ] Anotar o **UUID do admin/owner real** (será usado em §2 e §3).
> ⚠️ Nenhum `DELETE` ou `UPDATE` destrutivo deve rodar antes deste passo e de um `SELECT` de conferência.

---

## §2 — SEC-02: verificar e neutralizar usuários demo
**Nunca apague automaticamente. Garanta antes que existe um admin/owner real.**

### 2.1 Verificação (somente leitura)
```sql
-- Existem usuários demo?
select u.id, u.email, p.role, p.is_banned, p.is_owner
from auth.users u
join public.profiles p on p.id = u.id
where u.email in (
  'admin@codex.community','mod@codex.community',
  'ana@codex.community','bruno@codex.community','clara@codex.community'
)
order by u.email;

-- Quantos admins reais existem (fora os demo)?
select id, email from auth.users
where id in (select id from public.profiles where role = 'admin')
  and email not like '%@codex.community';
```

### 2.2 Decisão
- **Se já existe admin real** (e-mail próprio) → pode remover os 5 demos.
- **Se NÃO existe** → primeiro crie o admin real: Dashboard → **Authentication → Add user** (e-mail real + senha forte), depois:
```sql
-- substitua pelo UUID do novo admin real:
update public.profiles set role = 'admin', is_owner = true where id = '<UUID_DO_DONO_REAL>';
```
> Só depois disso prossiga para a remoção dos demos.

### 2.3 Neutralização (idempotente) — escolha UMA opção

**Opção A (recomendada): remover os usuários demo** (cascata limpa profiles/posts demo via `ON DELETE CASCADE`):
```sql
-- ⚠️ Confira o SELECT de 2.1 ANTES. Backup feito? Então:
delete from auth.users
where email in (
  'admin@codex.community','mod@codex.community',
  'ana@codex.community','bruno@codex.community','clara@codex.community'
);
```

**Opção B (conservadora): banir + rotacionar senha** (mantém histórico, bloqueia acesso):
```sql
update public.profiles set is_banned = true, role = 'member', is_owner = false
where id in (select id from auth.users where email like '%@codex.community');
-- e trocar a senha de cada um pelo Dashboard (Authentication → user → Reset password),
-- ou invalidar: update auth.users set encrypted_password = crypt(gen_random_uuid()::text, gen_salt('bf'))
--               where email like '%@codex.community';
```

### 2.4 Rollback (SEC-02)
- **Opção A:** restaurar do backup (§1) — usuários em `auth.users` não voltam sozinhos. Por isso o backup é obrigatório.
- **Opção B:** reverter flags: `update public.profiles set is_banned=false where id in (...);` e restaurar senha pelo Dashboard.

### 2.5 Garantia final
- [ ] Nunca reaplicar `supabase/seed.sql` / `supabase/_seed_cloud.sql` em produção (contêm `codex123!`).
- [ ] Tornar o seed estritamente local (ou remover as senhas fixas) — tarefa de follow-up.

---

## §3 — Owner absoluto (após aplicar a migration 0009)
A migration adiciona a coluna `is_owner` e a função `is_owner()`. **Marcar o dono é manual** (1 só):
```sql
-- confirme quem é antes:
select id, full_name, role, is_owner from public.profiles where id = '<UUID_DO_DONO_REAL>';
-- marque (mantém role='admin'):
update public.profiles set is_owner = true, role = 'admin' where id = '<UUID_DO_DONO_REAL>';
-- confirme unicidade:
select count(*) as owners from public.profiles where is_owner;   -- deve ser 1
```
> O índice único `profiles_single_owner_idx` impede um 2º owner. Para **transferir** titularidade: zere o atual (`update ... set is_owner=false`) e marque o novo, na mesma transação.
> Regras garantidas pela migration: owner não é banível/rebaixável por admin comum; admin só é banível pelo owner; owner gerencia admins.

---

## §5 — Aplicar as migrations no Supabase cloud (SQL Editor)
> O service_role não roda DDL via API; aplique manualmente, **após o backup (§1)**.
- [ ] Abrir Supabase Dashboard → **SQL Editor**.
- [ ] Colar e rodar o conteúdo de `supabase/migrations/0009_profile_security_and_owner.sql`.
- [ ] Colar e rodar o conteúdo de `supabase/migrations/0010_course_content_rls.sql`.
- [ ] Conferência pós-migration:
```sql
-- coluna owner existe?
select column_name from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name='is_owner';
-- RPCs existem?
select proname from pg_proc where proname in ('admin_set_role','admin_set_banned','is_owner');
-- grant de coluna aplicado? (authenticated só deve ter UPDATE nas 4 colunas)
select privilege_type, column_name from information_schema.column_privileges
where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE';
-- policies de lessons/modules atualizadas?
select policyname from pg_policies where tablename in ('lessons','course_modules');
```
> As migrations são **idempotentes** — podem ser reaplicadas sem dano.

---

## §6 — SEC-04: Auth no Supabase Dashboard (sem código)
- [ ] **Authentication → URL Configuration**
  - Site URL: `https://<seu-dominio>`
  - Additional Redirect URLs: `https://<seu-dominio>/**` **e** `https://<seu-dominio>/auth/callback`
  - (manter `http://localhost:3004/**` apenas se for testar local)
- [ ] **Authentication → Providers → Email**: decidir **Confirm email** ON/OFF.
  - Recomendado **ON** para membros reais (alinha com o branch `pending` de `registerAction`).
  - Se ON, configurar **SMTP transacional** (Resend/SendGrid) — o SMTP padrão do Supabase tem limite ~3/h.
- [ ] **Garantir no código/ambiente** que `NEXT_PUBLIC_APP_URL=https://<seu-dominio>` (o código já usa essa env em `auth.ts:14,55,83,103`; sem localhost hardcoded).
> Observação DOC-02: `supabase/config.toml` (`enable_confirmations=false`, `site_url` localhost) governa só a **stack local** do CLI — não afeta a cloud. Alinhar quando padronizar local×prod.

---

## §7 — Deploy Vercel + classificação Docker/Hetzner

### 7.1 Checklist Vercel (verificar no painel)
- [ ] Projeto Vercel conectado ao repositório GitHub correto.
- [ ] **Production Branch** = `main` (ou `master`).
- [ ] **Framework Preset** = Next.js · **Build Command** = `next build` (default) · **Output** = `.next` (default; **sem** `vercel.json`).
- [ ] **Environment Variables** (Production + Preview):
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (secret — nunca exposta ao client)
  - `NEXT_PUBLIC_APP_URL` = `https://<seu-dominio>`
  - (opcional) `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- [ ] **Domínio** oficial conectado e apontando para o projeto.
- [ ] Fluxo real documentado: **GitHub Desktop (commit/push) → GitHub `main` → Vercel build → Vercel deploy → domínio**.
> GitHub Desktop **não é CI**. O gate real de produção é o **Vercel Build** + os checks locais (`pnpm typecheck/lint/build`). Existe `.github/workflows/ci.yml` (typecheck/lint/build) — mantê-lo é útil como verificação extra no PR.

### 7.2 DOC-01 — Classificação dos arquivos Docker/Hetzner (NÃO remover agora)
| Arquivo | Classificação | Recomendação |
|---|---|---|
| `Dockerfile` | Legado provável (Hetzner self-host) | Manter; revisar em fase separada |
| `docker-compose.yml` | Legado provável | Manter; revisar |
| `Caddyfile` | Legado provável | Manter; revisar |
| `.github/workflows/deploy.yml` ("Deploy Hetzner", SSH) | **Legado/risco de ruído** | **Sugerir desativar** (dispara em push a `main`; sem secrets `HETZNER_*` falha silenciosa). Desativar em fase separada, com confirmação. |
| `.github/workflows/ci.yml` (typecheck/lint/build) | **Em uso / útil** | Manter |
> Decisão registrada: **Vercel é o deploy oficial**. Não apagar os arquivos Hetzner sem confirmação humana. Se confirmados como não usados, desativar `deploy.yml` (renomear/`if: false`/remover trigger) numa fase dedicada.

---

## §8 — SEC-07: `vercel.txt`
- [ ] Conteúdo são 6 strings hex `xxxxxxxx-xxxxxxxx` (não expostas aqui). Formato não bate com token Vercel padrão, mas é artefato órfão tipo-credencial.
- [x] **Adicionado ao `.gitignore`** (já feito neste commit).
- [ ] Como já está versionado, remover do índice e (se for segredo) do histórico:
```bash
git rm --cached vercel.txt
git commit -m "chore: parar de versionar vercel.txt (SEC-07)"
# se for segredo: rotacionar os valores na origem e limpar histórico (git filter-repo).
```
> Não foi removido do disco nesta fase (regra: não apagar sem confirmação).

---

## §9 — Testes obrigatórios (após aplicar migrations + marcar owner)

### 9.1 Checks locais — JÁ EXECUTADOS nesta fase ✅
- `pnpm typecheck` → exit 0 · `pnpm lint` → exit 0 · `pnpm build` → exit 0 (28 rotas).

### 9.2 Testes de banco (rodar no SQL Editor, simulando RLS)
> Use `set role authenticated; set request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}';` para simular um usuário; `reset role;` ao final.
```sql
-- (A) SEC-01: membro comum NÃO altera colunas sensíveis (deve FALHAR/0 linhas):
set role authenticated;
set local request.jwt.claims = '{"sub":"<UUID_MEMBRO>","role":"authenticated"}';
update public.profiles set points = 999999, is_banned = false, role = 'admin'
where id = '<UUID_MEMBRO>';      -- esperado: ERRO de permissão de coluna OU 0 colunas sensíveis alteradas
update public.profiles set full_name = 'Novo Nome' where id = '<UUID_MEMBRO>';  -- esperado: OK
reset role;

-- (B) SEC-05: não remover o último admin (deve lançar exceção):
select public.admin_set_role('<UUID_UNICO_ADMIN>', 'member');  -- esperado: ERRO "ultimo admin"

-- (C) Owner protegido: admin comum não rebaixa/bane owner:
-- (logado como admin não-owner) select public.admin_set_role('<UUID_OWNER>','member'); -- ERRO
--                                select public.admin_set_banned('<UUID_OWNER>', true);  -- ERRO

-- (D) award_points continua funcionando (member ganha pontos via função):
select public.award_points('<UUID_MEMBRO>','post_created',10,'post', gen_random_uuid());
select points from public.profiles where id = '<UUID_MEMBRO>';  -- aumentou

-- (E) SEC-03: membro comum não lê aula de curso draft:
-- (como membro) select count(*) from public.lessons l join public.courses c on c.id=l.course_id
--               where c.status='draft';   -- esperado: 0
-- (como moderador) o mesmo SELECT deve retornar > 0
```

### 9.3 Testes funcionais na UI (staging/preview Vercel)
- [ ] Membro edita perfil (nome/bio/avatar) → OK.
- [ ] Membro **não** vê alteração de points/level/role (sem UI; e o teste 9.2-A barra a API).
- [ ] Usuário banido não posta/comenta/curte (action + RLS).
- [ ] Admin comum: vê "Owner (protegido)" na linha do owner; não consegue rebaixar/banir owner.
- [ ] Owner gerencia admins (rebaixa/promove/bane admin).
- [ ] Tentar remover o único admin → mensagem "último administrador".
- [ ] Curso draft: membro comum recebe 404 na aula; moderador/admin acessa.
- [ ] Marcar aula de curso draft como membro → "Aula/Curso indisponível" (sem pontos).
- [ ] Redirects de auth usam o domínio real (confirmar e-mail/reset).

---

## §10 — Riscos restantes / follow-up (fora do escopo Fase 1)
- **DOC-02** (config.toml local × cloud), **DOC-03** (porta 3000×3004), **DOC-04/05** (docs desatualizados).
- **QUA-01** (`pnpm db:types` para tipos reais — após migrations), **PERF-01** (queries de aulas), **SEC-06/08/09**, **GAM-01**.
- Desativar `deploy.yml` (Hetzner) em fase dedicada.
- Tornar `seed.sql`/`_seed_cloud.sql` só-local (sem senha fixa).

## §11 — Plano de rollback (resumo)
| Mudança | Rollback |
|---|---|
| Migration 0009/0010 | Restaurar do backup §1; ou reverter pontualmente: `grant update on public.profiles to authenticated;` (desfaz SEC-01), `drop function admin_set_role, admin_set_banned, is_owner;`, recriar policies `*_select_all` com `using(true)` (desfaz SEC-03). |
| Código (actions/queries/UI) | `git revert` do commit da Fase 1 (Vercel redeploya o anterior). |
| SEC-02 (delete demos) | Restaurar do backup (auth.users não volta sozinho). |
| Owner | `update public.profiles set is_owner=false where id='<uuid>';` |
| `vercel.txt` no .gitignore | reverter linha do `.gitignore`. |

