# Auditoria de abuso do cadastro (Auth)

**Data:** 2026-07-10 · **Status:** estancado · **Classificação:** `SPAM DE SIGNUP CONFIRMADO`

Incidente independente da [contaminação por E2E](./INCIDENT_PRODUCTION_TEST_CONTAMINATION.md). Começou em 2026-07-07, antes de qualquer execução de teste contra produção.

## Resumo

Um agente automatizado criou **18 contas** entre 2026-07-07 e 2026-07-10, a um ritmo de aproximadamente **uma por hora**, usando endereços de e-mail de terceiros. O objetivo aparente não era obter conta no portal: era fazer o portal **enviar e-mails de confirmação não solicitados** a pessoas reais.

## Evidência

**Nomes gerados por máquina.** O campo `full_name` de cada conta é uma sequência alfanumérica de 16 a 24 caracteres, maiúsculas e minúsculas misturadas: `erTbHvxsXZCXOIOjZruv`, `YUmjsaZZMXJpEGFlAFaSaC`, `VgpCTFwbDaWWBymzcYJwDXGK`, `mdyqbTjWYsKZXNYPSL`. Nenhum humano digita isso no campo "nome".

**Nenhum login.** `last_sign_in_at` é nulo em todas as 18.

**E-mails de terceiros.** Domínios sem relação entre si — `earthlink.net`, `optonline.net`, `tuparks.com`, `rothmanortho.com`, `kongsberg.com`, `aglgastech.com`, além de gmail/hotmail/icloud/yahoo. Padrão de lista raspada.

**Duas contas confirmadas sem nunca logar** (`rothmanortho.com`, `kongsberg.com`). Quem clicou no link de confirmação não foi uma pessoa: foi o **gateway de segurança de e-mail** dessas empresas, que abre automaticamente os links recebidos. É a prova de que os e-mails chegaram a caixas de entrada reais.

**Ritmo deliberado.** Nunca mais de 2 cadastros por hora, na maior parte do tempo exatamente 1. Calibrado para passar por baixo de detectores de rajada.

## Por que as defesas existentes não pegaram

**O rate limit da aplicação é irrelevante para este ataque.** `registerAction` aplica `rateLimit("register:<ip>", 5/min)` em `src/server/actions/auth.ts:44-45`. Mas a chave `anon` é pública — está no bundle do browser — e o atacante fala **direto** com `POST /auth/v1/signup` do Supabase, sem passar pela Server Action. Um cadastro por hora nunca chegaria perto do limite de qualquer forma.

**Sem CAPTCHA.** Não há `captchaToken` em `supabase.auth.signUp` (`src/server/actions/auth.ts:62-69`), nem widget no formulário, nem configuração no Dashboard. Zero ocorrências de `captcha`/`turnstile`/`hcaptcha` no repositório.

**O fallback do rate limit não funciona em serverless.** Sem `UPSTASH_REDIS_REST_URL`/`_TOKEN`, `src/lib/security/rate-limit.ts:11-31` cai num `Map` em memória, que na Vercel vive por instância. O próprio arquivo documenta isso.

**Pontos antes da confirmação.** O trigger `handle_new_user` (`supabase/migrations/0038_onboarding_journey.sql:36-57`) grava `points = 10` no profile e uma linha em `points_ledger` **no INSERT em `auth.users`**, incondicionalmente. Um bot ganha pontos e entra no ranking sem nunca confirmar o e-mail. Duas das contas removidas tinham exatamente 10 pontos.

Detalhe que datou a migration: um bot de 2026-07-08 tinha `points = 0`; os de 09 e 10 de julho tinham `points = 10`. A `0038` foi aplicada na cloud entre essas datas.

## Classificação das 21 contas sem profile

| Grupo | Qtd | Critério |
|---|---|---|
| **BOT PROVÁVEL** | 15 | Nome alfanumérico aleatório · nunca logou · e-mail de terceiro |
| **TESTE CONFIRMADO (manual)** | 3 | `full_name` = `test`, `test2`, `test` · confirmadas · com login real |
| **TESTE CONFIRMADO (E2E)** | 3 | `e2e-*@codex.community` |

Mais 3 bots que ainda tinham profile foram identificados depois, pelos mesmos critérios. **Total: 18 bots.**

Nenhuma conta foi classificada como `INDETERMINADO`, e nenhuma conta legítima foi tocada.

## O detector de rajadas estava errado

A primeira consulta forense procurava `count(*) > 3` por minuto. Este ataque produz 1 por hora — passaria despercebido para sempre. Pior: sem excluir as contas E2E, **toda execução da suíte** (3 contas no mesmo segundo) apareceria como ataque.

O sinal correto ignora volume e olha comportamento:

```sql
select left(u.email,2) || '***@' || split_part(u.email,'@',2) as email,
       u.created_at, (u.email_confirmed_at is not null) as confirmado,
       p.full_name, p.points
from auth.users u
join public.profiles p on p.id = u.id
where u.last_sign_in_at is null
  and p.full_name ~ '^[A-Za-z]{14,}$'
  and not exists (select 1 from public.posts where author_id = u.id)
order by u.created_at desc;
```

## Contenção aplicada

**Signup público desligado** no Dashboard (`Authentication → Sign In / Providers → Allow new users to sign up`). É a única defesa que não depende de código: bloqueia o endpoint do Auth, que é justamente por onde o bot entra.

As 18 contas de bot e as 6 de teste foram removidas via `auth.users` (cascata correta). Estado verificado: `auth.users = profiles`, zero órfãos.

## Recomendação (F3)

Proporcional ao tamanho da comunidade. Nada de WAF, fingerprinting ou antifraude próprio.

1. **CAPTCHA oficial** — Cloudflare Turnstile ou hCaptcha, habilitado no Dashboard do Supabase. Protege o endpoint do Auth, não só o formulário. Exige enviar `options.captchaToken` em `signUp` (`auth.ts:62-69`) e renderizar o widget em `register-form.tsx`. **Os dois passos precisam sair juntos**: ligar o CAPTCHA sem o token derruba o cadastro legítimo.
2. **Rate limits oficiais do Supabase Auth**, no Dashboard. O limite da aplicação continua útil, mas não é a linha de defesa.
3. **Confirmação de e-mail** permanece ligada (já está).
4. **Pontos só após a confirmação.** Uma única fonte idempotente — no callback de confirmação **ou** no primeiro login confirmado, nunca nos dois. Remover a concessão do INSERT em `auth.users`. Migration nova.
5. Só então **reabrir o signup público**.

Enquanto o signup estiver desligado, novos membros entram por convite — que já é o fluxo real da comunidade.

## F3 — implementado (2026-07-10)

**Código (aplicado):**
- **CAPTCHA Turnstile** no login, cadastro e recuperação de senha (`src/components/auth/turnstile.tsx`, dentro dos 3 forms). O widget renderiza só se `NEXT_PUBLIC_TURNSTILE_SITE_KEY` existir — sem a chave, some sem quebrar os forms. As 4 auth actions passam `captchaToken` (`src/server/actions/auth.ts`, helper `readCaptcha`).
- **CSP**: `https://challenges.cloudflare.com` adicionado a `script-src` e `frame-src` (`next.config.ts`), host específico, sem wildcard.
- **Pontos após confirmação** (`supabase/migrations/0039`): `handle_new_user` cria o perfil com **0 pontos**; a concessão de +10 acontece via `award_signup_points` quando o e-mail está confirmado (no INSERT se já nasce confirmado — admin.createUser/local; ou no UPDATE `email_confirmed_at` null→data — usuário real). Idempotente pela unique do ledger. `award_signup_points` tem `revoke` de execução (não chamável por RPC), igual ao lockdown de `award_points` (0031). Bot que nunca confirma **nunca pontua**.

**Falta você fazer (Dashboard, não é código):**
1. Cloudflare → criar um site Turnstile → pegar **site key** (pública) e **secret key**.
2. Supabase → Auth → Attack Protection → habilitar CAPTCHA, provider Turnstile, colar a **secret key**.
3. Vercel → env `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = site key (nos 3 ambientes; pode usar a test key `1x00000000000000000000AA` em Preview/Dev).
4. Supabase → Auth → Rate Limits → revisar os limites oficiais de signup/token.
5. Só então **reabrir o signup** (Auth → Providers → Allow new users to sign up) — isso é a F5.

Ordem importa: habilitar o CAPTCHA no Dashboard **sem** a site key no ambiente derrubaria o cadastro legítimo. Configure os dois lados antes de reabrir.

Chave de teste do Turnstile (sempre passa, para desenvolvimento): site `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
