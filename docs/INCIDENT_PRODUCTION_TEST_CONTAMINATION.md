# Incidente P0 — Contaminação da produção pela suíte E2E

**Data:** 2026-07-10 · **Status:** contido · **HEAD:** `e73aba5` · **Classificação:** `P0 CONFIRMADO — ISOLAMENTO DE AMBIENTES QUEBRADO`

Dois incidentes independentes se cruzaram no mesmo dia. Este documento cobre o primeiro. O segundo está em [AUTH_SIGNUP_ABUSE_AUDIT.md](./AUTH_SIGNUP_ABUSE_AUDIT.md).

## Resumo

A suíte Playwright criou usuários, conteúdo e configurações **no Supabase de produção**, durante seis execuções locais em 2026-07-10. Uma das contas criadas tinha `role = admin` e senha constante versionada no git desde 2026-06-09. Nenhum membro legítimo foi perdido.

O `baseURL` do Playwright sempre foi `localhost`. Isso nunca protegeu nada: **o localhost não era o problema, o banco era.**

## Causa raiz

O E2E resolve o banco a partir do `.env.local`, sem nenhuma guarda de ambiente:

1. `e2e/admin-client.ts:15` — `loadEnvConfig(projectDir, true)` carrega o `.env.local` exatamente como o Next.
2. `e2e/admin-client.ts:17-18` — lê `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`. Não há verificação de qual projeto é.
3. `playwright.config.ts:64-70` — `webServer: pnpm start` sobe o app em `localhost:3004`, mas o app lê o mesmo `.env.local`.
4. `docs/PRODUCAO.md` (versão anterior a este incidente) instruía copiar as 4 variáveis **do `.env.local`** para a Vercel Production. Isto é, o mesmo projeto Supabase servia dev, teste e produção.

O CI está inocente: `.github/workflows/ci.yml:12-14` usa `https://dummy.supabase.co` e **não executa** `pnpm test:e2e`. Toda a contaminação veio de execuções locais.

## Por que ninguém percebeu por seis execuções

Três defeitos com a mesma assinatura — **a falha é silenciosa e o log afirma sucesso**:

| Defeito | Arquivo | Consequência |
|---|---|---|
| `deleteUser` retorna `{ error }` e não lança; o `try/catch` nunca lê o `error` | `e2e/global-teardown.ts:30-34` | Exclusão falha sem sinal |
| O log imprime `createdIds.length`, não o que foi apagado | `e2e/global-teardown.ts:36` | "3 usuários removidos" seria impresso mesmo com zero removidos |
| O `seed` lê os valores atuais e os grava como "original" | `e2e/settings-backup.ts:27-36` | Se um teardown falha, a contaminação vira o "backup" e as restaurações seguintes a reafirmam |

Nenhum dos três aparece em `typecheck`, `lint`, `build` ou nos 67 testes verdes.

## Linha do tempo (UTC)

| Quando | O quê |
|---|---|
| 2026-06-09 (`b84f465`) | Senha E2E constante `E2ePlaywright!2026` entra no git |
| 2026-07-10 12:47:34–36 | Execução A cria `e2e-{member,admin,journey}-1783687654130@codex.community`; uma promovida a `admin` |
| 2026-07-10 ~12:51 | Teardown de A imprime "3 usuários removidos". **Os três permaneceram.** |
| 2026-07-10 ~13:25 | Execução B: o `seed` lê as chaves `welcome_video.*` já contaminadas e as grava como "original" |
| 2026-07-10 13:29:11 | Teardown de B "restaura" `welcome_video.*` com os valores **do teste** |
| 2026-07-10 (tarde) | Contenção: rebaixamento do admin E2E, desligamento do signup público, exclusão das contas, verificação do invariante |

## Impacto

**Dados escritos em produção**
- 3 contas em `auth.users` + `profiles` (uma com `role = admin`).
- Conteúdo de teste: posts, comentários, cursos, apps, eventos e 1 recurso (`E2E Recurso 1783687687031`, id `8dc9c68c-c9f8-45c9-82fb-3639717fd4c7`).
- Tabela global `settings`: `welcome_video.enabled = true`, `welcome_video.url` apontando para um vídeo do YouTube usado pelo teste, `welcome_video.title = "Boas-vindas (E2E)"`.

**Exposição do vídeo errado:** próxima de zero. No momento da contaminação, 80 dos 81 membros com linha de onboarding eram *grandfathered* e nenhum tinha `welcome_video_completed_at`. Só um cadastro novo alcançaria o passo do vídeo, e os cadastros do período eram bots que nunca fizeram login.

**Membros legítimos perdidos:** nenhum.

## Erro de operação durante a resposta

Durante a contenção, linhas de `public.profiles` foram apagadas diretamente. `profiles` é o pai de 29 foreign keys — **24 em `on delete cascade`, 5 em `on delete set null`** — de modo que a exclusão removeu o conteúdo dependente (posts, comentários, pontos, onboarding, mensagens), zerou o `created_by` do resto, e deixou 21 linhas em `auth.users` **sem profile**: contas que ainda autenticavam num app quebrado.

A causa foi uma instrução ambígua na resposta ao incidente ("banir ou excluir a conta"), que não explicitou que "excluir" significa apagar `auth.users` pela API admin, deixando a cascata correr na direção certa. A direção importa:

- `delete from auth.users` → cascata apaga `profiles` e tudo que depende dele. **Correto.**
- `delete from public.profiles` → `auth.users` sobrevive, órfão. **Incorreto.**

Estado final verificado: `auth.users = 68`, `profiles = 68`, órfãos = 0.

## Segredos

| Item | Classificação | Ação |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | **Exposição interna desnecessária** — presente no `.env.local` da máquina de desenvolvimento e usada por E2E e scripts. Nunca commitada; o CI usa valores dummy. | Remover do fluxo local (F2). Rotação recomendada por higiene, não por comprometimento. |
| Senha E2E `E2ePlaywright!2026` | **Comprometida** — em `e2e/global-setup.ts:6`, versionada desde `b84f465`. | As contas correspondentes foram removidas. Substituir por senha aleatória por execução (F1). O valor permanece no histórico do git. |
| `admin@codex.community` / `codex123!` | **Credencial morta** — em `scripts/test-connection.mjs`, rastreada. A conta não existe (a migration `0025` a removeu). | Remover do script (F1). |

Nenhuma chave privilegiada alcança o bundle do cliente: os cinco importadores de `createAdminClient` são todos server-side.

## Correções

Ver [ENVIRONMENT_ISOLATION_POLICY.md](./ENVIRONMENT_ISOLATION_POLICY.md) (F1/F2) e [PRODUCTION_DATA_CLEANUP_PLAN.md](./PRODUCTION_DATA_CLEANUP_PLAN.md) (F4).

O teste que prova a contenção: executar a suíte com o `.env.local` apontando para produção **deve falhar antes de criar qualquer usuário**.
