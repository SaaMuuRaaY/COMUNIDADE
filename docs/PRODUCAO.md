# Checklist — Antes de receber pessoas reais

> Este doc lista **o que falta** para sair do "MVP rodando local" e ir pra "membros reais usando".
> Organizado por prioridade: **BLOQUEADORES** (não vá ao ar sem) · **IMPORTANTES** (faça na primeira semana) · **NICE-TO-HAVE**.

---

## Status atual (em 2026-05-31)

| Item | Status |
|---|---|
| Código MVP completo (30 rotas) | ✅ |
| Banco no Supabase Cloud com schema + RLS | ✅ |
| Auth funcionando (login/logout) | ✅ |
| Gamificação idempotente | ✅ |
| Build/lint/typecheck limpos | ✅ |
| Doc principal + Playbook | ✅ |
| **Deploy em produção** | ❌ |
| **Domínio próprio** | ❌ |
| **Email transacional** | ❌ |
| **Conteúdo real (cursos/posts)** | ❌ |
| **Backup automatizado** | ❌ |

---

## BLOQUEADORES (faça antes de mandar o primeiro link pra alguém)

### B1. Trocar senhas demo no banco
**Por quê:** seed criou 5 usuários com senha pública `codex123!`. Qualquer um que ver este repo entra como admin.

**Como:**
```sql
-- via SQL Editor do Supabase Cloud
update auth.users
   set encrypted_password = crypt('SUA_SENHA_FORTE_AQUI', gen_salt('bf'))
 where email = 'admin@codex.community';

-- repita pra cada user demo
-- ou simplesmente delete os 4 não-admin:
delete from auth.users
 where email in ('mod@codex.community','ana@codex.community','bruno@codex.community','clara@codex.community');
```

**Tempo:** 10 min

---

### B2. Trocar email do admin pro seu email real
**Por quê:** se esquecer senha do admin, recuperação manda pra `admin@codex.community` (não existe).

**Como:**
1. Supabase Dashboard → Authentication → Users
2. Clica no user admin → Edit
3. Troca email pro seu (ex: `seu@gmail.com`)
4. Confirma o email novo pelo link que chegar

**Tempo:** 5 min

---

### B3. Deploy do front em produção
**Por quê:** localhost não dá pra mandar pra alguém.

**Recomendação:** Vercel (free) — integração nativa com Next.js.

**Passo a passo:**
1. Crie repo Git (GitHub/GitLab) e suba o código de `COMUNIDADE/`:
   ```bash
   cd COMUNIDADE
   git init && git add . && git commit -m "MVP inicial"
   gh repo create codex-community --private --source=. --push
   ```
2. Acesse https://vercel.com → New Project → Import repo
3. **Root Directory**: `COMUNIDADE` (se subir o NEXUS inteiro) ou `/` (se subir só esta pasta)
4. Framework Preset: Next.js (auto-detect)
5. **Environment Variables**: adicione as 4 do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (vai virar `https://codex-community.vercel.app` por enquanto)
6. Deploy
7. Pega a URL final (`xxx.vercel.app`) e atualiza `NEXT_PUBLIC_APP_URL` + redeploy

**Tempo:** 30 min

---

### B4. Atualizar URLs de redirect no Supabase
**Por quê:** depois do deploy, login/auth-callback precisam saber a URL nova.

**Como:**
1. Supabase Dashboard → Authentication → URL Configuration
2. **Site URL**: `https://seu-dominio.com` (ou `https://xxx.vercel.app`)
3. **Redirect URLs** (adicionar):
   - `https://seu-dominio.com/**`
   - `https://xxx.vercel.app/**` (também, se deploy em Vercel)
   - Mantenha `http://localhost:3004/**` pra desenvolvimento local

**Tempo:** 5 min

---

### B5. Domínio próprio (recomendado, opcional pra MVP)
**Por quê:** `xxx.vercel.app` passa amadorismo. `comunidade.suamarca.com` é profissional.

**Como:**
1. Compre domínio (Registro.br, GoDaddy, Cloudflare)
2. Vercel → Project → Domains → Add → siga DNS
3. Atualize `Site URL` no Supabase (B4) com o domínio novo

**Tempo:** 1h (depende de propagação DNS)

---

### B6. Decidir e configurar confirmação de email
**Por quê:** Supabase Cloud vem com **"Confirm email" ligada por padrão**. Quem se cadastra recebe email com link. **Se SMTP padrão do Supabase, só funciona até 3 emails/h**.

**Opções:**

**A — Manter confirmação ON (mais seguro)**
- Vá em Supabase → Authentication → Providers → Email → mantenha "Confirm email" marcado
- Configure SMTP customizado (Resend, SendGrid, Mailgun) em Settings → Auth → SMTP. **Free tier do Resend é 100 emails/dia.**
- Customize templates de email (mesma página) com sua identidade

**B — Desligar confirmação (mais fácil, menos seguro)**
- Vá em Authentication → Providers → Email → **desmarque "Confirm email"**
- Membros logam direto após signup
- Risco: emails falsos podem se cadastrar

**Recomendação:** A (com Resend), 15 min de setup.

**Tempo:** 15 min (sem SMTP) ou 30 min (com Resend)

---

### B7. Criar conteúdo inicial mínimo
**Por quê:** comunidade vazia não engaja. Pessoa entra, vê vazio, sai.

**Mínimo viável:**
- [ ] 1 post de boas-vindas em "Avisos" (com Markdown bonito)
- [ ] 1 curso publicado com **pelo menos 1 módulo e 2 aulas**
- [ ] 3 recursos (PDFs ou templates) na biblioteca
- [ ] 3 apps cadastrados (ferramentas que sua tribo usa)
- [ ] 1 evento futuro no calendário (ex: live de boas-vindas em 3 dias)

Ver [PLAYBOOK.md](PLAYBOOK.md) para passo-a-passo de cada um.

**Tempo:** 2-4h

---

### B8. Remover usuários e dados demo do seed
**Por quê:** ninguém quer ver "Ana Silva publicou…" se não é sua comunidade.

**Como:**
```sql
-- via SQL Editor (CUIDADO — destrutivo)
delete from auth.users where email in (
  'mod@codex.community','ana@codex.community',
  'bruno@codex.community','clara@codex.community'
);
delete from posts where author_id::text in (
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555'
);
-- recursos e apps demo (apague se quiser refazer)
delete from resources where created_by::text in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
delete from apps where created_by::text = '11111111-1111-1111-1111-111111111111';
delete from events where created_by::text in (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);
-- cursos demo (cuidado, apaga aulas em cascata)
delete from courses where created_by::text = '11111111-1111-1111-1111-111111111111';
```

Faça **depois de** criar o conteúdo real (B7), pra nunca ficar com 0 conteúdo no ar.

**Tempo:** 10 min

---

## IMPORTANTES (primeira semana de uso)

### I1. Política de Privacidade e Termos
- Página estática `/termos` e `/privacidade`
- Link no footer da landing e do login
- Gerador rápido: https://termly.io/products/privacy-policy-generator/

### I2. Aviso de cookies / consentimento
- LGPD requer aviso pra IPs brasileiros
- Component simples no `app/layout.tsx` com localStorage flag

### I3. Backup do banco
- Supabase Free: backup diário automático mantido por 7 dias (Dashboard → Database → Backups)
- **Não conta como backup do que você gerencia** — exporte semanalmente:
  ```bash
  npx supabase db dump --db-url "postgres://..." > backups/$(date +%F).sql
  ```
- Cron weekly + upload pro Google Drive/Dropbox

### I4. Monitoramento de erros
- Vercel Analytics (free) cobre Core Web Vitals
- **Sentry** (free 5k events/mês) pra capturar exceptions JS e Server Action errors
- Adicionar em `src/app/layout.tsx`

### I5. Customizar templates de email
- Supabase → Authentication → Email Templates
- Personalize: confirmação, recuperação de senha, magic link
- Use linguagem da sua marca

### I6. Configurar SMTP real (se não fez em B6)
- Resend (100/dia free) ou SendGrid
- Evita "@noreply.supabase" no email enviado

### I7. Cumprir auditoria - médios pendentes
Ver [PROJETO.md §8.2](PROJETO.md):
- M1: Unificar tipo de retorno de Server Actions
- M4: revalidatePath em delete post/comment
- M6: `generateMetadata()` em rotas dinâmicas

### I8. Implementar notifications automáticas
- Triggers SQL pra criar `notifications` quando alguém comenta/curte seu post
- Sem isso a aba `/notifications` fica eternamente vazia

### I9. Trocar identidade visual da landing
- Hoje usa nome "CODEX Community" e visual neutro
- Editar `src/app/page.tsx` com nome real, descrição, valores, depoimentos

### I10. SEO básico
- `metadata` por página (já presente)
- Open Graph image (`opengraph-image.tsx` na raiz)
- `robots.txt` e `sitemap.ts` em `src/app/`

---

## NICE-TO-HAVE (próximos meses)

### N1. Upload nativo de arquivos
Substituir os "cole a URL" por `<FileUploader>` que sobe direto via Client → Storage com signed upload URL.

### N2. Realtime — quando alguém comenta seu post
Usar Supabase Realtime: subscribe em `post_comments` e disparar toast/notification.

### N3. Chat 1:1 ou em grupos
Schema novo: `conversations` + `messages`. Server Actions pra mensagem. Realtime pra atualizar.

### N4. Mobile (PWA)
Adicionar manifest.json + service worker. Vira "instalável" no celular sem build nativo.

### N5. App mobile nativo
React Native/Expo reusando o Supabase backend. Mesmo schema, novas telas.

### N6. Pagamentos (gating de cursos)
Stripe + Mercado Pago. Tabela `subscriptions`. Webhook `/api/stripe/webhook`. Field `courses.required_subscription_id`.

### N7. Certificados PDF ao concluir curso
Quando `lesson_progress` completou todas as aulas de um curso → gerar PDF server-side (pdfkit ou puppeteer) + email pro membro.

### N8. Quizzes ao final de aulas
Schema: `lesson_quizzes` (lesson_id, questions JSONB). Server Action pra submeter. Pontos +30 ao acertar 80%.

### N9. Multi-comunidade
Hoje o app assume 1 comunidade via `COMMUNITY_ID`. Pra multi: passar `community_id` em queries, rotas viram `/c/[slug]/...`, settings por comunidade.

### N10. White-label
Permitir cada comunidade ter logo/cores/domínio próprios. Tabela `communities` já preparada.

---

## Checklist resumido

Para responder "estamos prontos pra receber pessoas?":

```
[ ] B1 Senhas demo trocadas
[ ] B2 Email admin é real
[ ] B3 Deploy em Vercel funcionando
[ ] B4 Redirect URLs Supabase atualizadas
[ ] B5 Domínio próprio (opcional)
[ ] B6 Confirmação de email decidida + SMTP
[ ] B7 Conteúdo inicial criado (post, curso, recursos, apps, evento)
[ ] B8 Dados demo removidos
[ ] I1 Termos + Privacidade publicados
[ ] I2 Aviso LGPD
[ ] I3 Backup do banco semanal
[ ] Smoke test final: cadastra novo email → confirma → loga → posta → curte → vê ranking
```

Quando esses 12 estiverem ✅, **pode mandar o link pros primeiros membros**.

---

**Doc complementar:** [PROJETO.md §9.3](PROJETO.md) lista as 8 tarefas concretas de curto prazo de engenharia.
