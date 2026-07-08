# Playbook Operacional — CODEX Community

> Manual de "como operar a plataforma no dia-a-dia". Foco em **admin/moderador**. Cada aba explica o que fazer, onde clicar e como subir conteúdo.

> ⚠️ **Atualizado em 2026-07-08 (auditoria pós-release).** Algumas seções ainda descrevem o MVP original; onde houver conflito, vale o app atual e os docs `AUDIT_POST_RELEASE_*.md`. Principais mudanças desde a primeira versão: canais substituíram categorias (0013–0016), upload nativo existe (avatar, capas, imagem de post), notificações são automáticas (0008/0022), chat realtime + DMs + salvos + conexões (F02–F04), Biblioteca 2.0 com URLs próprias, onboarding com acordos, ranking mensal + recompensas.

---

## Antes de começar

### Como logar como admin
1. Acesse http://localhost:3004/login (ou seu domínio de produção)
2. Use a conta admin/owner real da comunidade (o usuário demo `admin@codex.community` foi **removido** na migration 0025 por segurança).
3. Você vai cair em `/dashboard`. No header aparece o badge 👑 Admin.

### Onde fica o painel admin
- No menu lateral (desktop): item **"Painel admin"** no fim do menu
- Atalho direto: http://localhost:3004/admin

---

## Onde subir conteúdo (Storage)

### Resumo
O MVP atual **NÃO tem upload nativo do navegador ainda**. Você sobe os arquivos pelo **Supabase Dashboard** e cola a URL pública/assinada no admin do CODEX. É 2 cliques a mais, mas funciona perfeitamente.

### Passo a passo geral

1. Acesse https://supabase.com/dashboard/project/yagjnowggkqvjrnysihi/storage/buckets
2. Escolha o bucket correto (ver tabela abaixo)
3. Clique **Upload file** e selecione do seu PC
4. Após upload, clique no arquivo → **Get URL** (público) ou **Get signed URL** (privado)
5. Cole essa URL no formulário do admin CODEX

### Mapa: o que vai em qual bucket

| Conteúdo | Bucket | Visibilidade | URL pra colar onde |
|---|---|---|---|
| Foto de perfil | `avatars` | público | em /profile, campo "URL do avatar" |
| Imagem/vídeo dentro de post | `post-media` | público | usuário sobe via composer no futuro |
| **Vídeo de aula** | `videos` | **privado** (URL assinada) | em /admin/courses/[id]/edit → URL do vídeo |
| **Material de apoio** (PDF, ZIP, slides) | `resources` | privado (URL assinada) | em /admin/resources → URL do arquivo |
| Arquivos de app | `apps` | privado | em /admin/apps → URL do arquivo |
| Capa de curso (imagem) | `course-covers` | público | em /admin/courses → URL da capa |

### Diferença: URL pública vs URL assinada

- **Pública** (`videos` e `course-covers` quando o admin escolhe "public URL"):  qualquer um com o link acessa. OK pra capa, NÃO ok pra vídeos premium.
- **Assinada** (signed URL): tem validade (1h, 1 dia, 1 semana). Depois expira. **Use isso pra vídeos de cursos** — assim impede que o link vaze pro WhatsApp.

⚠ **Quando assinada expira**, você precisa gerar nova URL e atualizar a aula. **Para MVP**, use signed URL de 1 ano. Para produção real, implementar regeneração automática (roadmap).

### Tamanhos máximos por bucket

| Bucket | Max | Por quê |
|---|---|---|
| avatars | 5 MB | foto pequena basta |
| post-media | 50 MB | imagens grandes + vídeos curtos |
| videos | 500 MB | aulas longas |
| resources | 100 MB | PDFs robustos, ZIPs grandes |
| apps | 50 MB | binários de tools |
| course-covers | 10 MB | imagem de banner |

---

## 1. Aba **Comunidade** (`/community`)

### Para quê serve
Feed estilo Skool/Reddit. Membros publicam dúvidas, apresentações, resultados, projetos. Curtidas, comentários e categorias.

### Como admin/moderador atua

**Subir um post de boas-vindas / aviso:**
1. Vá em `/community`
2. Clique no composer "O que está acontecendo? Compartilhe…"
3. Escolha categoria → para anúncios oficiais use **"Avisos"**
4. Título (opcional) + corpo em **Markdown** (negrito `**texto**`, itálico, links `[texto](url)`, listas, código)
5. Aba "Pré-visualizar" mostra como vai ficar
6. Publicar

**Moderar conteúdo:**
- Para excluir post de outro membro: em `/community`, clique no menu de 3 pontos do post → **Excluir** (admin/mod pode em qualquer post)
- Para excluir comentário: na página de detalhe do post (`/community/[id]`), clique no ícone 🗑 ao lado do comentário
- Para fixar um post no topo: hoje só via SQL Editor (`update posts set is_pinned=true where id='...'`). Próxima versão: botão no UI.

**Ver todos os posts moderáveis:**
- `/admin/posts` → lista os 100 mais recentes, incluindo excluídos
- Você pode excluir qualquer um (soft-delete, não some do banco)

### Canais disponíveis (substituíram as categorias antigas)
A comunidade é organizada em **canais com URL própria na raiz** (ex.: `/comece-por-aqui`, `/apresente-se`, `/duvidas-gerais`, `/comunicados`, `/agentes`, `/rotinas`, `/suporte-tecnico`, `/marketing-e-vendas`, `/compartilhe-seu-projeto`, `/vagas-e-oportunidades`, `/parcerias-e-colaboracoes`, `/cupons-e-descontos`, `/lives-e-encontros`) + Feed Geral em `/community`.

A fonte de verdade é `src/lib/community/structure.ts` (permissões de publicação/comentário por canal). Canal novo exige atualizar esse arquivo + CHECK no banco (migrations 0013–0017).

---

## 2. Aba **Cursos** (`/courses`)

### Para quê serve
Classroom estilo Hotmart/Skool. Cursos → Módulos → Aulas com vídeo + texto + arquivos.

### Como criar um curso novo

1. Vá em `/admin/courses` → clique **"+ Novo curso"**
2. Preencha:
   - **Título**: ex "Lógica de Programação"
   - **Slug**: gerado automaticamente (`logica-de-programacao`)
   - **Descrição**: 1-2 parágrafos do que o aluno vai aprender
   - **URL da capa**: subir imagem antes em `course-covers` bucket → colar URL
   - **Status**: `draft` (não aparece pra membros) ou `published` (visível)
3. Clicar **"Criar curso"** → você é redirecionado pro editor do curso

### Como adicionar módulos
1. No editor do curso (`/admin/courses/[id]/edit`)
2. Caixa "Adicionar módulo" → título → **Adicionar**
3. Repetir pra cada módulo. Ordem é por ordem de criação.

### Como adicionar aulas

Cada módulo tem uma caixa **"Nova aula"** logo abaixo da lista:

1. **Título da aula** (obrigatório)
2. **URL do vídeo** (opcional):
   - Sobe o vídeo no bucket `videos` do Supabase Dashboard
   - Após upload, gera **signed URL** com validade longa (1 ano)
   - Cola aqui
   - Aceita formatos: `mp4`, `webm`, `mov`
3. **Conteúdo / texto** (Markdown): roteiro escrito, transcrição, exercícios. Suporta blocos de código.
4. **Duração em segundos**: ex `420` pra 7 minutos. Aparece como "7m" no card.
5. Botão **"Adicionar aula"**

### Como o aluno consome

- Em `/courses` ele vê os cursos publicados com barra de progresso
- Clica → vê módulos e aulas
- Em cada aula tem player + botão **"Marcar como concluída"** → ganha +15 pts
- Re-marcar a mesma aula **não** dá pontos de novo (idempotente)

### Truques úteis

- **Aula gratuita prévia** (`is_free=true` no SQL): exibido com badge "Grátis" mesmo pra quem ainda não é membro. UI não expõe esse toggle ainda — usar SQL.
- **Reordenar aulas**: hoje a ordem é fixa por `order_index`. Pra reordenar: SQL `update lessons set order_index=N where id=...`.
- **Deletar curso**: hoje não tem botão de delete no editor. Use SQL: `delete from courses where id='...'`. Vai em cascata excluir módulos e aulas.

---

## 3. Aba **Recursos** (`/resources`)

### Para quê serve
Biblioteca de PDFs, planilhas, templates, código, checklists, ferramentas.

### Como subir um recurso

1. Sobe o arquivo no bucket `resources` do Supabase
2. Gera signed URL (ou pública se não for sensível)
3. Em `/admin/resources`, preencha:
   - **Título** (obrigatório)
   - **Categoria**: apostilas / templates / planilhas / códigos / checklists / ferramentas
   - **Descrição**: pra que serve
   - **URL do arquivo**: cola a URL gerada no passo 2
   - **Tipo MIME** (opcional): `application/pdf`, `application/zip`, etc — usado pra ícone
4. **Adicionar recurso**

### O que membros veem

- `/resources` → grid com todos os recursos, filtro por categoria (visual)
- Clicam no link **"Baixar"** → abre/baixa o arquivo

### Boas práticas

- **Versionar manualmente**: se mudar o PDF, gerar nova URL e atualizar registro. NÃO deletar o antigo se membros ainda usam o link antigo (signed URLs continuam válidas até expirar).
- **Categoria "Ferramentas"** vs aba `/apps`: use Recursos pra **arquivos** que se baixa. Use Apps pra **ferramentas online**.

---

## 4. Aba **Aplicativos** (`/apps`)

### Para quê serve
Biblioteca de **ferramentas externas e internas** que sua comunidade usa. Ex: Claude, n8n, Notion, calculadora interna.

### Como cadastrar um app

1. Em `/admin/apps`, preencha:
   - **Nome**: ex "Notion"
   - **Categoria**: ia / programação / automação / produtividade / marketing / comunidade / ferramentas-internas
   - **Tipo**: 
     - `link` — abre em nova aba (mais comum, ex: notion.so)
     - `embed` — incorpora num iframe na página (ex: calculadora interna, vídeo YouTube)
     - `file` — link de download
     - `internal` — ferramenta interna a desenvolver
   - **Status**: `active` · `coming-soon` · `beta`
   - **URL externa**: pra `link` e `internal`
   - **URL para embed**: pra `embed` (só funciona com domínios da allowlist)
   - **URL do arquivo**: pra `file`
   - **Ícone (URL)**: imagem 64×64 pra card
2. **Cadastrar app**

### Allowlist de embeds

Por segurança, **apenas estes domínios podem ser embebidos** em iframe:
- youtube.com · youtu.be
- vimeo.com · player.vimeo.com
- loom.com
- docs.google.com
- codepen.io · codesandbox.io
- github.com
- localhost · 127.0.0.1

Se quiser permitir outro domínio: adicionar em `SAFE_EMBED_HOSTS` no [src/lib/constants.ts](../src/lib/constants.ts) (decisão de segurança — avalie risco).

### Diferença prática

| Você quer adicionar… | Tipo |
|---|---|
| Link pro Notion da equipe | `link` |
| YouTube com pitch do produto incorporado | `embed` |
| ZIP com plugins do n8n | `file` |
| Tool própria pra rodar dentro da plataforma | `internal` |

---

## 5. Aba **Calendário** (`/calendar`)

### Para quê serve
Lives, mentorias, aulas, desafios, reuniões. Membros confirmam presença e ganham +20 pts ao marcar "Vou participar".

### Como criar um evento

1. Em `/admin/events`, preencha:
   - **Título**: "Live mensal Q&A"
   - **Tipo**: live / mentoria / aula / desafio / reuniao
   - **Início**: datetime picker (fuso local do navegador, salvo em UTC)
   - **Link externo**: URL do Meet/Zoom/YouTube Live
   - **Descrição**: pauta, pré-requisitos, etc
2. **Criar evento**

### Fuso horário

A aplicação **exibe sempre em `America/Asuncion`** (decisão do briefing). Para mudar, editar `timeZone` em [`src/app/(app)/calendar/page.tsx`](../src/app/(app)/calendar/page.tsx).

### Como membros usam

- `/calendar` mostra todos os eventos futuros + passados (passados com opacidade)
- Próximos 4 aparecem no `/dashboard`
- Clicam **"Confirmar presença"** → status `going` no banco + ganham +20 pts
- Toggle desfaz (vira `declined`, mas pontos já dados ficam — não tira)

### Lembretes automáticos

Hoje **não há email/push de lembrete**. Roadmap:
- Cron job 24h antes do evento → notification + email
- Cron job 1h antes → push

---

## 6. Aba **Ranking** (`/leaderboard`)

### Para quê serve
Top 50 membros por pontos. Mostra nível e role.

### Sua posição

Aparece destacada com fundo claro. Se não estiver no top 50, aparece a mensagem no topo.

### Como engajar com ranking

- Em posts de "Avisos", publique o ranking do mês mensalmente
- Considere premiar top 3 com algo simbólico (badge custom, mentoria privada)

### Customizar pontuação

Em [src/lib/constants.ts](../src/lib/constants.ts) → constante `POINTS`. Após mudar, próximas ações usam a nova pontuação (não recalcula histórico).

---

## 7. Aba **Membros** (admin: `/admin/members`)

### Operações comuns

| Quero… | Como |
|---|---|
| Promover member → moderator | Select de papel na linha do membro |
| Promover moderator → admin | Mesmo select |
| **Banir** um membro | Botão "Banir" → toggle. Membro banido **não pode** publicar, comentar, curtir, marcar aulas, RSVP. Pode logar e ler. |
| Desbanir | Mesmo botão (vira "Desbanir") |
| Excluir conta de vez | Hoje só via SQL: `delete from auth.users where id='...'` (cascateia tudo) |

### Visão de membro

Membros normais veem `/members/[id]` (perfil público de qualquer um) com posts recentes. Lista de "todos os membros" não está exposta — adicionar se quiser feature de networking.

---

## 8. Aba **Configurações** (admin: `/admin/settings`)

### O que controla

- **Nome da comunidade**: aparece em metadata/SEO (futuramente em header)
- **Descrição**: aparece em landing pública e SEO
- **Cor primária**: hoje informacional (não troca o tema visual). Para tema dinâmico: implementar override de CSS variables.
- **Visibilidade**: `private` (atual) ou `public` (futuro: comunidade aberta sem confirmação)

### Valores salvos
Vão na tabela `settings` (key/value JSONB). Para ler:
```sql
select key, value from settings;
```

---

## 9. Aba **Notificações** (`/notifications` + sino do header)

### Estado atual
- Notificações são **criadas automaticamente por triggers** desde as migrations 0008 e 0022:
  - curtida no seu post → notifica o autor
  - comentário no seu post → notifica o autor
  - nova mensagem direta → notifica o destinatário
- O sino do header mostra badge de não lidas com painel popover; "marcar todas como lidas" disponível.
- Notificação manual (avisos pontuais) ainda é via SQL:
```sql
insert into notifications (user_id, title, body, type)
values ('UUID_DO_MEMBRO', 'Bem-vindo!', 'Aproveite a comunidade.', 'system');
```

### Roadmap
- Menções `@username` com notificação (Feature F-01 do roadmap pós-release).

---

## 10. Aba **Perfil** (`/profile`)

### Edição pelo próprio membro
- Nome
- Username (precisa ser único)
- Bio (280 chars)
- URL do avatar (sobe em `avatars` bucket → cola URL pública)

### O que admin NÃO pode fazer pelo painel hoje
- Editar perfil de outro membro (só via SQL no banco)
- Trocar email de um membro (Supabase Auth → Dashboard → Authentication → Users)

---

## Operações que ainda exigem SQL (não tem UI)

| Tarefa | SQL |
|---|---|
| Fixar post no topo | `update posts set is_pinned=true where id='UUID'` |
| Marcar aula como gratuita | `update lessons set is_free=true where id='UUID'` |
| Reordenar módulos | `update course_modules set order_index=N where id='UUID'` |
| Reordenar aulas | `update lessons set order_index=N where id='UUID'` |
| Excluir curso | `delete from courses where id='UUID'` (cascade) |
| Excluir conta de usuário | `delete from auth.users where id='UUID'` (cascade) |
| Resetar pontos de alguém | `update profiles set points=0, level=1 where id='UUID'; delete from points_ledger where user_id='UUID';` |
| Criar notificação manual | `insert into notifications (user_id, title, body, type) values (...)` |

⚠ **TODOS esses são candidatos a virar UI no roadmap**. Por enquanto, SQL Editor do Supabase é a forma.

---

## Rotina sugerida (admin do dia-a-dia)

### Diariamente (5 min)
1. `/admin` → conferir KPIs (membros, posts, próximos eventos)
2. `/community` → responder dúvidas críticas, curtir posts bons (engajamento puxa engajamento)
3. `/admin/posts` → moderar spam/inadequado se houver

### Semanalmente (30 min)
1. Publicar 1 post em "Avisos" com novidades
2. Adicionar 1-2 recursos novos (curadoria)
3. Criar evento da semana (live/mentoria)
4. Ler `/leaderboard` → mensagem privada pros top 3 (futuro: in-app messaging)

### Mensalmente (1-2 h)
1. Subir 1 curso ou módulo novo
2. Auditar membros inativos → email de win-back (manual hoje)
3. Revisar `points_ledger` → ver quais ações geram mais engajamento
4. Atualizar settings se mudou identidade visual

---

**Próximo doc:** [PRODUCAO.md](PRODUCAO.md) — checklist completo antes de receber membros reais.
