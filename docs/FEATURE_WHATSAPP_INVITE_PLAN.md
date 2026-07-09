# PLANO — Feature 2: Convite inteligente para o grupo do WhatsApp

**Data:** 2026-07-09 · Base: `master` @ `39296e6` · Auditoria (F0) já feita; decisões travadas com o dono.

## Contexto
Convidar o membro para o grupo oficial do WhatsApp **depois** que ele já se engajou — nunca no 1º login. Convite por link + confirmação manual. Sincronização real com o WhatsApp fica para a Feature 3 (só estudo de viabilidade; sem automação não-oficial).

## Decisões travadas
- **Elegibilidade:** onboarding concluído (`member_onboarding.completed_at IS NOT NULL`). O dashboard já faz essa query.
- **Frequência:** 3 exibições — na hora que fica elegível → +7 dias → +21 dias (a partir da 1ª). Depois, nunca mais.
- **Encerram na hora:** "Já entrei" (joined_claimed) e "Não mostrar novamente" (dismissed). **"Entrar no grupo"** só registra o clique (analytics) e **não** encerra — a cadência continua até o membro confirmar. **"Agora não"** só fecha (a próxima exibição respeita o cooldown).

## Não-objetivos (anti-overcoding)
- Sem automação/scraping/bot do WhatsApp. Sem múltiplos grupos, campanhas ou segmentação. Sem RPC `SECURITY DEFINER` (o estado do convite é do próprio membro; forjar afeta só o próprio popup e o próprio analytics — baixo risco).

## Modelo de dados — Migration `0037` (aditiva, sem RLS nova)
6 colunas em `member_onboarding` (a policy `member_onboarding_update_own` já cobre colunas novas):
```sql
alter table public.member_onboarding
  add column if not exists whatsapp_invite_first_shown_at timestamptz,
  add column if not exists whatsapp_invite_last_shown_at  timestamptz,
  add column if not exists whatsapp_invite_show_count      integer not null default 0,
  add column if not exists whatsapp_invite_clicked_at      timestamptz,
  add column if not exists whatsapp_joined_claimed_at      timestamptz,
  add column if not exists whatsapp_invite_dismissed_at    timestamptz;
```
Rollback: `drop column` das 6. A linha sempre existe quando elegível (o `submitOnboardingAction` já fez upsert).

**Dois estados separados desde já** (à prova de futuro): `joined_claimed` (auto-declarado) vs. um futuro `joined_verified` (sincronização oficial) — não misturar.

## Config no Admin (settings — reusa a infra preservada)
Adicionar a `SETTING_KEYS`: `whatsapp_invite.enabled`, `whatsapp_invite.url`, `whatsapp_invite.title`, `whatsapp_invite.description`. Card novo no `settings-form.tsx` (análogo ao vídeo de boas-vindas que removi). O popup só aparece se `enabled` + `url` presente.

## Fases
- **F1 — Migration 0037 + tipos.** Aplicar local (`db:reset` → `db:types`); cloud depois, com aprovação.
- **F2 — Função pura de elegibilidade/cooldown** (`src/lib/whatsapp/invite.ts`, testável isolada): recebe `{state, nowMs}` → `shouldShow`.
- **F3 — Server actions** (`src/server/actions/whatsapp.ts`): `recordInviteShown` (idempotente/debounce contra StrictMode), `recordInviteClicked`, `claimJoined`, `dismissInvite`. Todas UPDATE na própria linha (RLS own).
- **F4 — Config admin** (settings keys + card no form + page).
- **F5 — Popup** (`whatsapp-invite.tsx`, Radix Dialog): 4 ações; link em nova aba com `rel="noopener noreferrer"`; registra "shown" 1× na montagem (ref guard).
- **F6 — Montagem no dashboard** (estende a query de `member_onboarding` já existente; sem query extra) + gates + E2E.

## Segurança / cuidados
- Estado do convite é own-writable — forjar afeta só o próprio membro (cadência/analytics). Documentado, aceito.
- URL do grupo em `settings` é legível por qualquer membro logado (elegibilidade é engajamento, não segredo).
- `recordInviteShown` com debounce server-side (não incrementa se `last_shown_at` < 1h) contra duplo-registro.

## Gates
`typecheck · lint · build · test:e2e · diff --check` + migration 0037 aplicada (local; cloud sob aprovação).

## Aprovação
Nada é escrito sem "vai". Migration na cloud e deploy só após gates verdes e aprovação explícita.
