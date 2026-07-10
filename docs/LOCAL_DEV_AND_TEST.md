# Desenvolvimento e testes locais

Depois do incidente de 2026-07-10, **nada em desenvolvimento fala com o Supabase de produção**. Nem o `pnpm dev`, nem o E2E, nem os scripts. A guarda em `src/lib/env-isolation.ts` derruba qualquer processo que tente.

Sincronia de versão acontece **só via commit + deploy** (a Vercel builda do git). O que muda no seu localhost fica no seu Supabase local.

## Os quatro ambientes

| Ambiente | `APP_ENV` | Supabase | Quem sobe |
|---|---|---|---|
| Local (dev) | `local` | CLI local, `127.0.0.1:54321` | `pnpm db:start` |
| Test (E2E) | `test` | o mesmo local, resetado | idem |
| Preview | `preview` | projeto staging | Vercel |
| Production | `production` | projeto de produção | Vercel |

## Setup local (uma vez)

```bash
pnpm db:start          # sobe Postgres, Auth, Storage e Inbucket locais
```

O comando imprime `API URL`, `anon key` e `service_role key`. Essas chaves são **fixas e públicas** (iguais em toda instalação local do Supabase) — não são segredo.

Crie os dois arquivos de ambiente (ambos ignorados pelo git):

**`.env.local`** — usado por `pnpm dev` e pelo HUB (`iniciar_hub.bat`):
```
APP_ENV=local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key impressa>
SUPABASE_SERVICE_ROLE_KEY=<service_role key impressa>
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

**`.env.test`** — usado pela suíte E2E (copie de `.env.test.example`): mesmos valores, com `APP_ENV=test`.

## Rodar

```bash
pnpm dev               # app local contra Supabase local
pnpm db:reset          # zera o banco e aplica migrations + seed
pnpm test:e2e          # E2E: build + start + Playwright, tudo contra o local
```

E-mails de teste caem no **Inbucket** (`http://127.0.0.1:54324`), nunca são enviados de verdade.

## O que a guarda impede

- `pnpm dev` / `pnpm test:e2e` com `.env` apontando para produção → **não sobe**.
- `APP_ENV` ausente, inválido, ou URL inválida → **não sobe**.
- Produção apontada para o projeto errado → **não sobe**.
- Não há bypass. Uma guarda que se desliga não é uma guarda.

Prova: `e2e/env-isolation.spec.ts` verifica que browser, servidor e admin client falam com o mesmo projeto local — nenhuma requisição vai para `*.supabase.co`.

## Ler produção de propósito (raro)

Alguns scripts (ex.: `journey-impact-count.mjs`) leem produção legitimamente. Exigem **declarar** o ambiente:

```bash
APP_ENV=production node --env-file=<arquivo-com-credenciais-de-producao> scripts/journey-impact-count.mjs
```

Sem `APP_ENV=production`, a guarda bloqueia — é isso que impede o acesso **silencioso** à produção.

## Por que o local nunca funcionou antes

Descoberto durante o incidente: as migrations **nunca concederam** o DML de API
(`select/insert/update/delete`) a `anon`/`authenticated`/`service_role`. Na cloud
isso passa despercebido porque a **plataforma Supabase concede automaticamente**;
no local, não — então o app não conseguia nem criar um post, e todo mundo acabava
usando produção. Essa foi a raiz do incidente.

O baseline de grants agora está no `supabase/seed.sql` (local-only), escopado a
**tabelas e sequências** — nunca funções, para não reverter o lockdown de
`award_points` (0031). A RLS continua gateando cada linha.

> Nota de reprodutibilidade: os grants de produção são comportamento **implícito
> da plataforma**, não estão em migration. Se um dia a produção for reconstruída
> só a partir das migrations, faltará esse baseline. Promover o grant do seed a uma
> migration versionada é uma decisão em aberto (toca produção no próximo deploy,
> ainda que de forma idempotente) — ver o incidente.

## Vercel

Variáveis **distintas** por ambiente (Development / Preview / Production). Nunca reaproveitar as de Production. Cada uma com seu `APP_ENV`. Ver `docs/PRODUCAO.md`.
