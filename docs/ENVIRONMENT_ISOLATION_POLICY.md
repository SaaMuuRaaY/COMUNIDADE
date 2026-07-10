# Política de isolamento de ambientes

Escrita em resposta ao [incidente de 2026-07-10](./INCIDENT_PRODUCTION_TEST_CONTAMINATION.md). Vale a partir da F1.

## Princípio

Um ambiente não produtivo **nunca** se conecta ao Supabase de produção. Isso não é convenção nem disciplina: é uma verificação que derruba o processo antes da primeira chamada de rede.

O `baseURL` da aplicação é irrelevante para essa garantia. O que define o ambiente é o **project ref do Supabase**.

## Os quatro contextos

| Contexto | `APP_ENV` | Supabase | Onde |
|---|---|---|---|
| **Local** | `local` | Supabase CLI local (`127.0.0.1:54321`) | máquina do dev |
| **Test** | `test` | Supabase local, resetável | E2E |
| **Preview** | `preview` | projeto **staging** dedicado | Vercel Preview |
| **Production** | `production` | projeto de produção | Vercel Production |

Regras que decorrem:

- `.env.local` **sempre** aponta para o Supabase local. Nunca para produção.
- A credencial de produção existe **somente** na Vercel Production.
- Preview usa staging, com dados fictícios.
- Testes usam Supabase local, com e-mails capturados pelo Inbucket (`supabase/config.toml`), nunca enviados de verdade.
- `.env.test.example` é rastreado. `.env.test` é ignorado.
- A Vercel tem valores **distintos** para Development, Preview e Production. Nunca reaproveitar os de Production.

## A guarda

`src/lib/env-isolation.ts`:

```ts
export const PRODUCTION_PROJECT_REF = "<ref>";
export type AppEnv = "local" | "test" | "preview" | "production";
export function projectRefOf(url: string): string;   // lança se a URL for inválida
export function assertEnvIsolation(): void;           // hard fail
```

O ref de produção é uma **constante rastreada**, não uma variável de ambiente. Variável seria bypass trivial — e o ref já é público, porque vai no bundle do browser.

A guarda falha quando:

- `APP_ENV` não existe;
- `APP_ENV` tem valor fora dos quatro;
- `NEXT_PUBLIC_SUPABASE_URL` não é uma URL válida;
- o project ref não pode ser derivado da URL;
- `APP_ENV != "production"` e o ref **é** o de produção;
- `APP_ENV == "production"` e o ref **não é** o de produção.

Não se usa `NODE_ENV`: builds de Preview também rodam como `production`.

**Não existe bypass.** Nenhum `SKIP_ENV_GUARD`. Uma guarda que se desliga com uma variável não é uma guarda.

A verificação roda na **criação do client**, antes de qualquer `fetch` — não no primeiro erro de rede.

Pontos de aplicação: `src/lib/env.ts`, `src/lib/supabase/admin.ts`, `e2e/admin-client.ts`, `e2e/global-setup.ts`, `scripts/journey-impact-count.mjs`, `scripts/test-connection.mjs`.

## Guarda adicional do E2E

Antes de tocar a rede, `e2e/global-setup.ts` recusa:

- project ref de produção;
- `baseURL` de domínio produtivo;

e imprime **apenas** `APP_ENV` e o ref — nunca uma chave. A falha acontece **antes** do primeiro usuário ser criado.

## Como o E2E carrega o ambiente

Carregar `.env.test` só em `e2e/admin-client.ts` **não basta**. O `webServer` do Playwright sobe o Next em paralelo; se o processo do Next não receber as variáveis de teste, o frontend e as Server Actions continuam falando com produção enquanto o setup fala com o local. Esse é o pior cenário possível, porque parece resolvido.

O env de teste precisa alcançar: `build`, `start`, `globalSetup` e a execução do Playwright.

Fluxo:

```
supabase start
supabase db reset
build + start (com env de teste)
playwright
supabase stop
```

**Prova obrigatória:** um smoke test durante o E2E deve afirmar que frontend, Server Actions e admin client apontam para o **mesmo project ref local**. Sem essa prova, a F2 não fecha.

## Contrato do teardown

O incidente mostrou que a limpeza falhava em silêncio. A partir da F1:

- `deleteUser` retorna `{ error }` e **não lança**. O `error` tem que ser lido.
- Nenhum log pode afirmar sucesso a partir do tamanho de um array. O número reportado é o número **verificado**.
- Falha de limpeza **quebra a suíte**. Um teardown que falha e passa é pior que nenhum teardown, porque cria confiança falsa.
- O backup de estado global (`settings`) nunca pode gravar como "original" um valor deixado por uma execução anterior.

## Credenciais

- Senha dos usuários E2E: **aleatória por execução** (`crypto.randomBytes`), nunca impressa, guardada só no arquivo ignorado `e2e/.runtime/users.json`.
- Nenhuma credencial em script rastreado.
- Nenhum documento deste repositório instrui copiar `.env.local` para a Vercel.

## CI

O CI roda `typecheck`, `lint` e `build` com valores dummy. **Não executa E2E** contra nenhum banco remoto. Quando o E2E entrar no CI, ele sobe o Supabase local no runner.
