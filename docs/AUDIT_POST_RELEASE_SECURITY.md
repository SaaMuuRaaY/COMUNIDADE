# AUDITORIA PÓS-RELEASE — SEGURANÇA

**Data:** 2026-07-08 · HEAD `fea4992` · Verificação em duas passadas (especialista + revisão adversarial sobre o código/SQL real).

## Veredito geral

**Postura de segurança sólida.** Nenhuma vulnerabilidade P0. 1 vulnerabilidade real de severidade P2 (superfície restrita a admin), demais itens são hardening. As correções críticas de ciclos anteriores estão **confirmadas no SQL vigente**.

## 1. Vulnerabilidade real

### SEC-01 · `external_url` de eventos sem guard de protocolo — P2 · VERIFICADO
- **Evidência:** `src/lib/validations/schemas.ts:250` usa só `z.string().url()` (aceita `javascript:`/`data:`); renderizado cru em `href` no calendário (`calendar/page.tsx:91`) e dashboard. Os demais campos de URL (`file_url`, `embed_url`, `cover_url`, social links) usam `refine(isSafeHttpUrl/isSafePublicImageUrl)` — este ficou de fora.
- **Exploração:** requer admin malicioso/comprometido (RLS: só admin cria eventos) → clique do membro executa script. Por isso P2 (defesa em profundidade), não P0.
- **Correção mínima:** `.refine(isSafeHttpUrl)` no schema (1 linha). Esforço P.

## 2. Hardening recomendado (não vulnerabilidades)

| ID | Item | Evidência | Esforço |
|---|---|---|---|
| ~~HRD-01~~ | **FALSO POSITIVO (verificado na execução do Bloco 0, 2026-07-08):** todas as SECURITY DEFINER já têm `set search_path = public` em todas as migrations — nenhuma ação | — | — |
| HRD-02 | `ALLOWED_DOC_EXTENSIONS` inclui `js/ts/jsx/tsx/html` (upload admin-only; risco de preview XSS se compartilhado) | `src/lib/constants.ts:82-87` | P |
| HRD-03 | Fallback de rate-limit em memória é por instância (documentar exigência de Upstash em produção + log de alerta) | `src/lib/security/rate-limit.ts:85-89` | P |
| HRD-04 | Campo manual de URL no avatar-uploader só valida na action (UX confusa, sem risco real) | `avatar-uploader.tsx:103-109` | P |
| HRD-05 | Alterações em `settings` por admin sem trilha de auditoria | 0006:303-314 | M (futuro) |

## 3. Defesas verificadas e funcionando (não mexer)

| Área | Evidência |
|---|---|
| **Open redirect bloqueado** — `safeNextPath()` rejeita absolutas, `//`, backslash; fallback /dashboard | actions de auth + callback |
| **award_points trancado** — REVOKE public/anon/authenticated, GRANT service_role | 0031:15-18 |
| **Pontos não forjáveis** — valores fixos (`POINTS.*`) no server; idempotência por UNIQUE(user,action,ref) | `lib/points/award.ts` |
| **Governança de pontos** — `admin_adjust_points` com `is_admin()` + motivo obrigatório; estorno automático em soft-delete (0032) e hard-delete (0035) | SQL confirmado |
| **Cursos draft protegidos** — policies por `status='published' OR moderador` | 0010:11-36 |
| **DM sem impersonação** — `sender_id` da sessão; participação verificada; bloqueio bidirecional; profanity server-side | `direct-messages.ts` |
| **Anti-lockout admin** — `admin_set_role`/`admin_set_banned` SECURITY DEFINER com FOR UPDATE, proteção de owner e do último admin | 0009 |
| **Banimento centralizado** — `requireActiveProfile` nos layouts + checks nas mutações + proxy.ts | código + proxy.ts:73-78 |
| **Uploads validados** — MIME `image/*` + 5MB + path com prefixo do userId | `use-image-upload.ts:24-30` |
| **XSS em markdown bloqueado** — rehype-sanitize com schema restrito (http/https/mailto) | `shared/markdown.tsx` |
| **Guards de protocolo nas URLs** (exceto SEC-01) — `isSafeHttpUrl`/`isSafePublicImageUrl` | schemas.ts |
| **Service-role segregado** — só em `getPublicPreview` (teaser), trending e awardPoints; nunca no client | grep verificado |
| **Headers** — CSP (frame-src allowlist), HSTS 2 anos, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy; no-store em /admin | next.config.ts:28-66 |
| **Rate limiting** — Upstash + fallback local (login 10/min, registro 5/min, post 12/min, DM 30/min) | rate-limit.ts |
| **RLS em 100% das tabelas** — incl. `community_migration_backup` (0035); matriz completa no relatório de banco | 35 migrations |

## 4. Matriz de papéis (vigente, resumo)

| Recurso | anon | member | moderator | admin | owner |
|---|---|---|---|---|---|
| Posts/comentários | — | CRUD próprios (regras do canal) | + moderar | + canais admin-only | idem admin + imune a ban/rebaixamento |
| Cursos/aulas | — | ler published | ler tudo | CRUD | idem |
| Biblioteca/eventos | — (preview público só teaser via service-role) | ler / RSVP próprio | idem | CRUD | idem |
| Chat | — | ler tudo, escrever se não banido, editar próprios | + moderar | idem | idem |
| DMs | — | participante | participante | + leitura de auditoria (denúncias) | idem |
| Pontos/ledger | — | ler próprios | ler todos | + ajustar (RPC auditada) | idem |
| Rewards | — | ler | ler | emitir/remover | idem |
| Perfis | — | editar próprio (campos não sensíveis) | idem | tudo (RPCs anti-lockout) | protegido |

## 5. Falsos positivos de segurança descartados

- "award_points aberto a authenticated", "aulas draft vazando", "sem estorno de pontos", "sem governança" — **todos remediados** (0010/0031/0032/0035), origem em docs antigos.
- "Upload sem validação" — falso (validação presente).
- "GRANT authenticated em `admin_*`" — seguro por design: guarda `is_admin()` interna + SECURITY DEFINER.
- `get_trending_posts` SECURITY INVOKER — design correto (respeita RLS do chamador).

## 6. Pendências operacionais (fora do repo — CONFIRMAR MANUALMENTE)

1. ~~Migration 0035 aplicada na cloud?~~ ✅ **CONFIRMADO pelo IAGO em 2026-07-08** — 0035 aplicada na cloud.
2. Auth URLs (Site URL/Redirects) no Dashboard Supabase — pendência antiga registrada.
3. `UPSTASH_REDIS_*` configurado na Vercel (senão rate-limit é por instância).
4. DSN do Sentry configurado em produção.

---

*Nenhuma correção aplicada. SEC-01 e hardening entram no Bloco 0 do roadmap, sujeitos a aprovação.*
