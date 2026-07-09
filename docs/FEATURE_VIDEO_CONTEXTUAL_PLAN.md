# PLANO — Vídeo contextual em posts + criar-post no feed geral

**Data:** 2026-07-09 · Base: `master` @ `d427bef` (Bloco 0 + F1 no ar). Auditoria por workflow de 5 leitores + verificação direta.

## Contexto (por que este trabalho existe)

O dono levantou duas questões após a F1 (vídeos externos):

1. **Vídeo deve ser contextual.** Hoje o vídeo de boas-vindas mora em **Admin → Configurações** — o admin não deveria entrar no painel para postar algo diferente; ele já tem acesso administrativo dentro das próprias camadas (canais). Vídeo deveria funcionar como imagem num post: anexável inline no canal.
2. **Sumiu o botão de criar post** no feed geral `/community`.

### Fatos apurados (evidência)
- **Biblioteca já é contextual** ✅ — `video_url` está no `ResourceForm` compartilhado e o `CreateResourceButton` está montado em `/resources` ([resources/page.tsx:40](../src/app/(app)/resources/page.tsx#L40)). Nenhuma mudança.
- **Posts já têm o ponto de extensão para vídeo, sem migration** — `posts.media_url`/`media_type` existem desde a 0002 (sem CHECK); o `post-card` já ramifica por `media_type` (`video/` → `<video>`, senão `<img>`, [post-card.tsx:279-295](../src/components/community/post-card.tsx#L279-L295)); `YouTubeVideoEmbed` + parser já existem da F1. **Falta** o ramo YouTube e um campo de URL no composer.
- **Fixar post já existe inline** ([post-card.tsx:252-261](../src/components/community/post-card.tsx#L252-L261)) e o feed ordena fixados primeiro → "vídeo de boas-vindas = post fixado" é turnkey depois do vídeo-em-post.
- **Q2 não é regressão** — `CommunityGeneralFeed` é view-only por decisão da Feature 02 ([community-feed.tsx:30-31](../src/components/community/community-feed.tsx#L30-L31)); a F1 não tocou nisso.

### Decisões do dono (2026-07-09)
- **Vídeo de boas-vindas → post fixado** no canal Comece por aqui; **retirar** a config de Admin → Configurações.
- **Feed geral** → **composer inline com seletor de canal**.

### Não-objetivos (anti-overcoding)
- Sem upload de arquivo de vídeo (nada de `accept="video/*"`, sem quota/transcodificação). Vídeo = **URL do YouTube** (externa), reusando a infra da F1.
- Sem tabela de mídia universal, sem construtor de páginas, sem migration.

---

## BLOCO A — Vídeo do YouTube como anexo de post (núcleo da Q1)

**Sem migration.** Um post passa a poder carregar OU imagem OU vídeo do YouTube (o slot `media_url` é único → mutuamente exclusivos).

| # | Arquivo | Mudança |
|---|---|---|
| A1 | [src/lib/validations/schemas.ts](../src/lib/validations/schemas.ts) (`postSchema`, ~149-158) | Guard: quando `media_type === 'youtube'`, exigir `isYouTubeUrl(media_url)` (import de `@/lib/video/youtube`). `.superRefine` no objeto. |
| A2 | [src/components/community/post-composer.tsx](../src/components/community/post-composer.tsx) + novo `post-video-field.tsx` (ou estender `PostImageField` → `PostMediaField`) | Adicionar input "Vídeo do YouTube" (URL) ao lado da imagem, **mutuamente exclusivo**: ao colar URL válida, seta `mediaUrl=url`, `mediaType='youtube'` e limpa a imagem (e vice-versa). Preview via `YouTubeVideoEmbed`. |
| A3 | [src/components/community/post-card.tsx](../src/components/community/post-card.tsx) (~278, antes do ramo `video/`) | Novo ramo: `media_type === 'youtube'` (ou `isYouTubeUrl(media_url)`) → `<YouTubeVideoEmbed url={media_url} title={post.title} />`. Import de `isYouTubeUrl` + `YouTubeVideoEmbed`. |

- **Sem mudança** em `createPostAction` (já lê `media_url`/`media_type` do FormData) nem em `POST_SELECT` (já traz ambos).
- **Quem pode anexar:** qualquer um que já pode postar no canal — igual à imagem. Consistente com "como as imagens e posts em geral".
- **Fora do MVP:** editar mídia de um post existente (o dialog de edição hoje só mexe em título/corpo/canal). O vídeo entra na **criação**. Registrar como evolução.
- **Verificar (segurança):** `createPostAction` reusa o guard de canal (`canPostInChannel`) no servidor? Confirmar durante a implementação — vale tanto para A quanto para C.

**Aceite A:** criar post com URL de watch num canal → renderiza player nocookie; imagem e vídeo não coexistem; URL não-YouTube com `media_type='youtube'` é rejeitada.

---

## BLOCO B — Vídeo de boas-vindas vira post fixado; retirar Admin (Q1)

**Depende de A.** Como a config de vídeo em Admin está **vazia em produção** (ninguém preencheu), não há conteúdo a migrar — é uma limpeza direta.

| # | Arquivo | Mudança |
|---|---|---|
| B1 | — (ação de conteúdo, sem código) | Admin cria um **post com vídeo do YouTube** no canal Comece por aqui e clica **Fixar**. Fica no topo do feed com selo "Fixado". |
| B2 | [src/app/(app)/comece-por-aqui/page.tsx](../src/app/(app)/comece-por-aqui/page.tsx) | Remover import de `WelcomeVideo` e a prop `beforeFeed`. |
| B3 | [src/components/onboarding/welcome-video.tsx](../src/components/onboarding/welcome-video.tsx) | Remover o componente (fica órfão). |
| B4 | [src/lib/config/settings.ts](../src/lib/config/settings.ts), [src/server/queries/settings.ts](../src/server/queries/settings.ts) | Remover as chaves `welcome_video.*`. **Manter** o helper `getSettings` (infra reutilizável). |
| B5 | [src/server/actions/admin.ts](../src/server/actions/admin.ts), [src/app/admin/settings/settings-form.tsx](../src/app/admin/settings/settings-form.tsx) | Remover as chaves de vídeo de `SETTING_KEYS` e o card "Vídeo de boas-vindas" do form. |

- **Risco:** remover só o específico de `welcome_video.*`; não tocar em `community.*` nem no helper `getSettings`. **Rollback:** reverter o commit.
- **CSP / `SAFE_EMBED_HOSTS`:** permanecem (o embed continua sendo usado por posts e Biblioteca).

**Aceite B:** Admin → Configurações não tem mais seção de vídeo; um post fixado com vídeo aparece no Comece por aqui.

---

## BLOCO C — Criar post no feed geral com seletor de canal (Q2)

Um post exige um canal (`category`). O composer passa a aceitar uma **lista** de canais quando não há canal fixo.

| # | Arquivo | Mudança |
|---|---|---|
| C1 | [src/components/community/post-composer.tsx](../src/components/community/post-composer.tsx) | Nova prop opcional `channels?: {slug,label}[]`. Se presente, renderizar `<Select>` de canal (estado interno `selectedSlug`, default = 1º) e usar o slug escolhido como `category`. Mantém 100% compatível com o uso atual (canal fixo via `channelSlug`). |
| C2 | [src/components/community/community-feed.tsx](../src/components/community/community-feed.tsx) (`CommunityGeneralFeed`) | Calcular canais postáveis: `CHANNELS.filter(c => canPostInChannel(profile, c.slug))` menos chat/pending. Se ≥1, renderizar `<PostComposer channels={...} currentUserId={profile.id} />` após o `SectionBanner`. Se 0, não renderiza (membro sem permissão). |
| C3 | [src/lib/community/structure.ts](../src/lib/community/structure.ts) | (Opcional) helper `postableChannels(profile)` para não duplicar o filtro. Reusa `CHANNELS`, `canPostInChannel`, `isChatChannel`, `isChannelPending`. |

- **Segurança:** o `<Select>` já só lista canais permitidos, mas `createPostAction` **deve** revalidar `canPostInChannel` no servidor (mesmo ponto do Bloco A). Não confiar só no client.
- **UX:** MVP com label genérico "Criar publicação"; atualizar `placeholder`/`guidance` conforme o canal escolhido é um nice-to-have (via `getChannelComposer(slug)`).

**Aceite C:** em `/community`, um admin/membro com permissão vê "Criar publicação", escolhe o canal, escreve (com imagem ou vídeo do YouTube) e o post cai no canal certo; membro sem permissão não vê o composer.

---

## Gates e testes

```bash
pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e && git diff --check
```
- **Sem migration** → sem `db:reset`/`db:types`.
- **E2E novos/estendidos** (`e2e/`): (1) anexar URL do YouTube a um post num canal → embed nocookie renderiza; (2) criar post a partir de `/community` via seletor → post aparece no canal escolhido. Ancorar ações otimistas em `waitForResponse` (padrão da suíte). Reusar seed/cleanup dos specs atuais.
- **Regressão:** confirmar que os specs que usam `/community` (busca) seguem verdes com o composer presente.

## Fases sugeridas (uma feature, entrega incremental)
1. **Bloco A** (vídeo-em-post) — é o pré-requisito de tudo.
2. **Bloco C** (composer no feed geral) — independente de B, ganha o vídeo "de graça".
3. **Bloco B** (retirar Admin + post fixado) — por último, depois de A validado.

## Aprovação
Nenhum código será escrito sem seu "vai". Todos os blocos são aditivos/reversíveis, sem migration, sem tocar banco/cloud. Deploy só após gates verdes e sua aprovação.
