# Plano de limpeza de dados de produção

Referente ao [incidente de 2026-07-10](./INCIDENT_PRODUCTION_TEST_CONTAMINATION.md). Parte foi executada como contenção emergencial; o restante fica registrado como procedimento.

## A regra que originou o erro

`profiles` é o pai de **29 foreign keys**: 24 em `on delete cascade` e 5 em `on delete set null` (`courses.created_by`, `apps.created_by`, `resources.created_by`, `events.created_by`, `rewards.emitted_by`). A direção da exclusão decide tudo:

```
delete from auth.users   →  cascata apaga profiles e tudo que depende dele.   CORRETO
delete from public.profiles →  auth.users sobrevive, órfão, ainda autenticável.  ERRADO
```

Durante a resposta ao incidente, `profiles` foi apagado diretamente. Resultado: 21 contas capazes de autenticar num app sem perfil. Nenhuma limpeza deve tocar `public.profiles`.

## Ordem obrigatória

Nunca "apagar conteúdo `set null` e depois o usuário": isso destrói o vínculo antes de usá-lo.

1. **Backup/export** (`scripts/backup.sh`).
2. **Dry-run** — é o padrão; executar exige `--confirm` explícito.
3. **Manifesto de IDs**, obtido antes de qualquer escrita. Nunca `LIKE '%E2E%'`.
4. Excluir **cursos, apps, recursos e eventos** de teste **pelos IDs confirmados**, enquanto `created_by` ainda aponta para o usuário.
5. Excluir os **usuários** (`delete from auth.users`, ou API admin).
6. **Validar as cascatas** contra a lista de FKs derivada do catálogo, não contra uma lista manual:

```sql
select c.conrelid::regclass as tabela, a.attname as coluna, c.confdeltype as on_delete
from pg_constraint c
join unnest(c.conkey) with ordinality k(attnum, ord) on true
join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum
where c.contype = 'f'
  and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass);
```

7. **Verificar zero órfãos** — o invariante de saúde do banco:

```sql
select (select count(*) from auth.users)      as usuarios,
       (select count(*) from public.profiles) as profiles,
       (select count(*) from auth.users u
         where not exists (select 1 from public.profiles p where p.id = u.id)) as orfaos;
```

`usuarios = profiles` e `orfaos = 0`.

## `created_by` é `set null`, não `cascade`

`courses`, `apps`, `resources`, `events` (e `rewards.emitted_by`) usam `on delete set null`. Conteúdo criado pelo admin de teste **sobrevive** à exclusão da conta, com `created_by` nulo — e o vínculo se perde para sempre.

Por isso o passo 4 vem antes do 5. E por isso o inventário de dependências tem que rodar **antes** de qualquer exclusão.

Resíduo conhecido deste incidente: recurso `8dc9c68c-c9f8-45c9-82fb-3639717fd4c7` (`E2E Recurso 1783687687031`), já órfão.

## Configurações globais (`settings`)

Não apagar automaticamente. O procedimento:

1. comparar `updated_at` com o horário das execuções de teste;
2. confirmar que a alteração veio do teste;
3. restaurar o valor anterior **a partir do backup**;
4. corrigir pela UI de `/admin/settings`, não por SQL — `getSettings()` é cacheado com `unstable_cache` e um `UPDATE` direto não invalida o cache.

Neste incidente as chaves `welcome_video.*` foram sobrescritas pelo seed do E2E, e o "restore" do teardown as reafirmou como se fossem originais (ver o defeito do `settings-backup.ts` no relatório do incidente). O backup local havia sido apagado. Os valores originais não eram recuperáveis.

## Separação de lotes

Três categorias, três procedimentos. **Nunca no mesmo lote.**

- **Teste confirmado** — exclusão direta por ID.
- **Bot provável** — exclusão após revisão dos critérios (nunca logou, nome alfanumérico, sem conteúdo). Ver [AUTH_SIGNUP_ABUSE_AUDIT.md](./AUTH_SIGNUP_ABUSE_AUDIT.md).
- **Indeterminado** — revisão manual. Não se apaga.

Apagar por predicado é o que transforma um filtro ligeiramente errado numa perda de dados. Depois de revisar, apague **pelos IDs que a revisão devolveu**, não repetindo o `where`.

## O que foi executado em 2026-07-10

| Ação | Resultado |
|---|---|
| Rebaixamento do `role` da conta admin E2E | `admin` → `member` |
| Desligamento do signup público (Dashboard) | ataque de spam estancado |
| Exclusão das 21 contas órfãs em `auth.users` | cascata limpou `sessions`, `identities`, `refresh_tokens` |
| Exclusão dos 3 bots restantes, pelos IDs revisados | — |
| Invariante | `usuarios = profiles = 68`, órfãos = 0 |

Pendente: exclusão do recurso órfão e correção das chaves `welcome_video.*` pela UI de admin.

## Rollback

Não há rollback para exclusão em `auth.users` sem backup. O `scripts/backup.sh` roda `supabase db dump` e é o único ponto de retorno. Se um restore for necessário, restaure o snapshot num **projeto separado** e extraia de lá as linhas a reinserir — nunca restaure por cima da produção, que jogaria fora tudo o que aconteceu depois.
