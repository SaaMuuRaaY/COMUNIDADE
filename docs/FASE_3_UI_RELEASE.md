# FASE 3 — UI Nexus · Relatório de Release (pós-deploy)

> **Data:** 2026-06-14 · **Commit em produção:** `d42d0aa feat(ui): identidade Nexus (dark+neon) + logo + landing de comunidade` (em `origin/master`, deployado pela Vercel).
> **Escopo desta auditoria:** validar que a nova UI **não quebrou fluxos críticos**. Nenhuma feature nova, nenhum banco/Auth/RLS tocado.

## Status da validação automática (local = paridade Vercel)
| Check | Resultado |
|---|---|
| `pnpm typecheck` (`tsc --noEmit`) | ✅ verde |
| `pnpm lint` (eslint) | ✅ verde |
| `pnpm build` (`next build`) | ✅ verde — 29 rotas, `/` estática (○), demais SSR (ƒ) |
| Working tree | limpo (0 não-commitado); `master` = `origin/master` |

> Observação: este ambiente não tem navegador — a validação **visual ao vivo** (console real, contraste percebido, mobile) é manual, no checklist abaixo. Os **fluxos de acesso** foram validados por rastreamento de código + a auditoria multi-agente pré-commit (veredito GO: 100% UI, zero arquivo de lógica alterado).

## A. Arquivos alterados (28)
**Novos (8):**
- `public/nexus-logo.png` · `src/components/shared/logo.tsx` (logo Nexus)
- `src/components/nexus/{theme-constants.ts, theme.ts, theme-settings.tsx}` (motor de tema + SettingsDrawer)
- `src/styles/nexus/{tokens.css, components.css}` (design system)
- `docs/UI_NEXUS_AUDIT.md` (auditoria UI-0)

**Modificados (20):**
- **Design/shell:** `src/app/globals.css` (token-bridge + dark-first + cherry-pick base), `src/app/layout.tsx` (`data-theme/style/density` + BOOT_SCRIPT), `components/layout/{header,sidebar,mobile-nav}.tsx`
- **Páginas:** `app/page.tsx` (landing nova), `app/(auth)/layout.tsx`, `app/(legal)/layout.tsx`, `app/(legal)/termos/page.tsx`, `app/banned/page.tsx`, `app/global-error.tsx`, `app/(app)/{dashboard,leaderboard,courses/[courseId]}/page.tsx`, `app/(auth)/register/register-form.tsx`
- **Componentes UI:** `components/ui/{badge,dialog,sheet}.tsx`, `components/community/feed-filter.tsx`, `components/courses/lesson-player.tsx`

> Intocados (confirmado): `src/server/**`, `supabase/**`, `src/lib/auth`, `src/lib/permissions`, `proxy.ts`, `src/lib/supabase`, `package.json`, `next.config.ts`, `env.ts`. **Sem deps novas, sem env nova, nada a aplicar no Supabase.**

## B. Decisões visuais
- **Tema dark-first** (`data-theme=dark`, `data-style=refined`) com **neon controlado**; accent **cyan (hue 200)** padrão.
- **Token-bridge**: tokens do shadcn apontam para os tokens Nexus (`--background←--bg-app`, `--primary←--accent`, etc.). `--accent` = cor de **marca**; hover do shadcn remapeado para `--bg-hover` (corrige a colisão que deixava selecionados/ícones sem contraste).
- **SettingsDrawer** (⚙️ no header): toggle de tema (dark/light), estilo (refined/cyberpunk/terminal), accent (4 cores) e densidade — persiste em `localStorage`, anti-flash via BOOT_SCRIPT no `<head>`.
- **Logo Nexus** (`/nexus-logo.png`) em todo o branding visual (sidebar, header, auth, legal, landing). Favicon e `api/health` mantidos.
- **Landing** repositionada: **comunidade gratuita de IA**, foco em convite/participação grátis; **estática** (sem fetch Supabase → mais rápida e sem ruído no console). Rodapé: "Nexus HUB · ano / Criado por Iago Amorim Dias".
- **Estados selecionados** em alto contraste (preenchido accent ou anel accent + texto claro). Hotspots hardcoded tokenizados (`--overlay`, `--success`, `--warning`, `--video-bg`).

## C. Fluxos críticos — validação por código (não regrediram)
| Fluxo | Status | Evidência |
|---|---|---|
| Rotas públicas (`/`, `/login`, `/register`, `/forgot-password`, `/banned`, `/termos`, `/privacidade`) | ✅ | Buildam; `proxy.ts` (whitelist) **inalterado** |
| Rotas autenticadas `(app)` | ✅ | `requireActiveProfile` (gate de banido→/banned) **inalterado**; só estilo mudou |
| Rotas admin | ✅ | `requireAdmin` + `proxy` (role=admin) **inalterados** |
| **Owner protegido** em `/admin/members` | ✅ | `member-row.tsx`/`policies.ts` **fora deste diff** (commit anterior) — lógica intacta |
| **Banido → /banned + logout** | ✅ | `banned/page.tsx`: só `className` mudou; `getCurrentProfile`+redirect intactos |
| Membro comum não acessa admin | ✅ | gates inalterados |
| UI components (badge/dialog/sheet) | ✅ | só classes/tokens; **API/props idênticas** |

## D. Checklist de validação MANUAL (no site ao vivo) — fazer no navegador
**Rotas/acesso:**
- [ ] `/` abre (landing de comunidade, dark, logo, sem "MVP").
- [ ] Login / cadastro / "esqueci a senha" funcionam.
- [ ] Deslogado em rota privada → `/login`. Banido → `/banned` + botão **Sair** funciona.
- [ ] **Owner** acessa `/admin`; em `/admin/members` a linha do owner mostra **"Owner protegido"** (sem dropdown/ban).
- [ ] **Membro comum** não acessa `/admin` (→ /dashboard).
- [ ] Admin acessa `/admin` e CRUDs (cursos/recursos/apps/eventos/membros/configurações) renderizam.

**Tema/visual:**
- [ ] ⚙️ Aparência: trocar tema/estilo/accent/densidade aplica ao vivo e persiste após reload (sem flash claro→escuro).
- [ ] Estados **selecionados** (sidebar ativo, toggles do ⚙️, filtro do feed, sua linha no Ranking) com contraste claro.
- [ ] **Mobile** (≤360px): sidebar→menu, nav inferior, header sem overflow.
- [ ] **Console do navegador** sem erros vermelhos relevantes (ver risco R3).

## E. Riscos restantes (não bloqueiam; nenhum crítico)
- **R1 — Logo no tema Claro:** o wordmark é prateado/metálico → baixo contraste se o usuário trocar para tema **Claro**. *(prever variante escura do logo p/ light)*
- **R2 — `course-card.tsx:31`** ainda usa `dark:bg-zinc-800` (variante legada); funciona (segue `data-theme`), mas é resíduo a uniformizar em tokens.
- **R3 — `AuthApiError: Invalid Refresh Token`** em rotas autenticadas: **pré-existente** (não da Fase 3), aparece quando o cookie de sessão expira; é capturado, não quebra. Tratá-lo graciosamente é hardening de **Auth** (fora do escopo desta fase).
- **R4 — Estilo "terminal"** não troca a fonte para mono (literais de fonte sobrescritos pelo `@theme`). Só afeta esse preset opcional; refined/cyberpunk OK.
- **R5 — `api/health` `name: "CODEX Community"`** mantido (identificador do HUB). Renomear depois se o HUB permitir.

## F. Próximos ajustes recomendados (ordem)
1. **Validar o checklist D no site ao vivo** (especialmente owner/banido/admin + console).
2. **R1**: variante do logo para o tema claro (ou travar UI em dark se light não for usado).
3. **R2**: migrar `course-card` para tokens Nexus (`--bg-elev`/`--bg-card`).
4. **Fase 2 — Conteúdo mínimo** (post de boas-vindas, 1 curso, recursos/apps/evento) para a home logada não nascer vazia.
5. (Opcional) **R3** hardening do refresh token no `proxy.ts`; **R4** elevar seletor do preset terminal; **R5** alinhar nome no HUB.

## Veredito
✅ **Release saudável no nível de build/código.** Build, typecheck e lint verdes; fluxos de acesso (público/autenticado/admin/owner/banido) **preservados** (entrega 100% UI, sem tocar lógica/banco/Auth). Pendente apenas a **validação visual manual** (checklist D) no site ao vivo. Nenhum bug visual **crítico** encontrado nesta auditoria.
