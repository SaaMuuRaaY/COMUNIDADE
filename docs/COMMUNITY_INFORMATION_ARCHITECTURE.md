# Arquitetura da Informação — Comunidade Portal Nexus (FASE 1)

> Entregável da **Fase 1** do roadmap de reestruturação. **Sem código, sem banco, sem migration, sem commit.**
> Documento de contrato: define navegação, grupos, canais, slugs, permissões, URLs e o mapa de migração. As Fases 2–7 implementam **exatamente** o que está aqui.
> **Decisões travadas (Fase 0):** modelagem **estática** (config no código) · URLs em **path** `/community/c/[slug]` · **classificar por tipo** (discussão / comunicado / página / feature futura).

---

## 1. Navegação principal (5 grupos) — final

| Grupo | Ícone (id) | Itens (label → href) |
|---|---|---|
| **Geral** | `layout-dashboard` | Início → `/dashboard` · Comunidade → `/community` |
| **Aprender e Construir** | `graduation-cap` | Cursos → `/courses` · Recursos → `/resources` · Aplicativos → `/apps` |
| **Participação** | `calendar` | Calendário → `/calendar` · Ranking → `/leaderboard` |
| **Conta** | `user` | Notificações → `/notifications` · Perfil → `/profile` |
| **Administração** | `wrench` | Painel admin → `/admin` *(só admin)* |

Regra: **Cursos, Recursos, Aplicativos e Calendário permanecem MÓDULOS** (não viram canais). Mobile mantém a bottom-bar de 5 (Início, Comunidade, Cursos, Recursos, Calendário).

---

## 2. Estrutura da Comunidade — grupos + canais (catálogo)

`tipo`: D=discussão (membro publica) · C=comunicado (admin/mod publica). `publ`: quem publica. `com`: comentários habilitados. `of`: canal oficial.

### Grupo 1 — Boas-vindas (`boas-vindas`, ícone `door-open`)
| Ordem | Canal | slug | tipo | publ | com | of | Descrição |
|--:|---|---|:--:|---|:--:|:--:|---|
| 1 | Comece por aqui | `comece-por-aqui` | C | admin | ❌ | ✅ | Onboarding e primeiros passos (broadcast) |
| 2 | Apresente-se | `apresente-se` | D | member | ✅ | — | Novos membros se apresentam |
| 3 | Comunicados | `comunicados` | C | moderator | ✅ | ✅ | Anúncios oficiais da comunidade |
| 4 | Lives e encontros | `lives-encontros` | C | moderator | ✅ | ✅ | Lives/encontros (integra Calendário na Fase 6) |

### Grupo 2 — Networking (`networking`, ícone `users-round`)
| Ordem | Canal | slug | tipo | publ | com | of | Descrição |
|--:|---|---|:--:|---|:--:|:--:|---|
| 1 | Compartilhe seu projeto | `compartilhe-seu-projeto` | D | member | ✅ | — | Mostre o que está construindo |
| 2 | Chat e networking | `chat-networking` | D | member | ✅ | — | Conversa geral e conexões |
| 3 | Dicas e novidades | `dicas-novidades` | D | member | ✅ | — | Dicas, links e novidades |
| 4 | Vagas e oportunidades | `vagas-oportunidades` | D | member | ✅ | — | Vagas e oportunidades |

### Grupo 3 — Mercado e Negócios (`mercado-negocios`, ícone `store`)
| Ordem | Canal | slug | tipo | publ | com | of | Descrição |
|--:|---|---|:--:|---|:--:|:--:|---|
| 1 | Marketing e vendas | `marketing-vendas` | D | member | ✅ | — | Marketing, vendas, aquisição |
| 2 | Parcerias e colaborações | `parcerias-colaboracoes` | D | member | ✅ | — | Busca de parcerias |
| 3 | Serviços e oportunidades | `servicos-oportunidades` | D | member | ✅ | — | Ofertas de serviços |
| 4 | Projetos e negócios | `projetos-negocios` | D | member | ✅ | — | Projetos e negócios |

### Grupo 4 — Suporte e Construção (`suporte-construcao`, ícone `life-buoy`)
| Ordem | Canal | slug | tipo | publ | com | of | Descrição |
|--:|---|---|:--:|---|:--:|:--:|---|
| 1 | Dúvidas gerais | `duvidas-gerais` | D | member | ✅ | — | Perguntas e suporte da comunidade |

> **Features futuras (fora deste roadmap de comunidade — NÃO são canais):** Agentes especialistas · Agentic Builder · Vibe Builder · Gestão de agentes. Entrarão como **módulos próprios** quando priorizados; não recebem slug de canal agora.

### Grupo 5 — Portal Nexus (`portal-nexus`, ícone `shield`)
| Ordem | Item | slug/rota | tipo | publ | com | of | Descrição |
|--:|---|---|:--:|---|:--:|:--:|---|
| 1 | Benefícios | `beneficios` | C | admin | ❌ | ✅ | Benefícios do Portal (broadcast) |
| 2 | Cupons e descontos | `cupons-descontos` | C | admin | ❌ | ✅ | Cupons e descontos (broadcast) |
| 3 | Regras da comunidade | **página** `/community/regras` | — | — | — | — | Página estática (não é feed) |
| 4 | Perguntas frequentes | **página** `/community/faq` | — | — | — | — | Página estática (não é feed) |

**Resumo:** 15 canais de feed (10 discussão + 5 comunicado) + 2 páginas + 4 features futuras. **Canal padrão** de `/community` = `comece-por-aqui`.

---

## 3. Matriz de permissões por canal

| Regra | Comportamento |
|---|---|
| **Ver** (todos os canais) | Qualquer membro **não-banido** vê todos os canais/posts (v1 sem canais privados). |
| **Publicar — canal `member`** | Qualquer membro não-banido publica. |
| **Publicar — canal `moderator`** | Só moderador/admin (owner é admin). |
| **Publicar — canal `admin`** | Só admin/owner. |
| **Comentar** | Permitido onde `com=✅`; bloqueado onde `com=❌` (UI+Action+RLS). |
| **Reagir** | Em qualquer post visível (inalterado). |
| **Editar próprio post** | Autor edita; **mover entre canais públicos** = ver **D1**; **nunca** mover p/ canal restrito. |
| **Fixar / moderar / excluir** | Moderador/admin (inalterado); autor exclui o próprio. |
| **Owner** | Imune (inalterado). **Banido** | Sem publicar/comentar/reagir (inalterado). |

**Canais restritos** (publish ≠ member, reforço em RLS): `comece-por-aqui`, `comunicados`, `lives-encontros`, `beneficios`, `cupons-descontos`.
**Canais sem comentário** (`com=❌`, reforço em RLS): `comece-por-aqui`, `beneficios`, `cupons-descontos`.

---

## 4. Contrato de URLs

| Uso | URL | Observação |
|---|---|---|
| Feed de um canal | `/community/c/[slug]` | Ex.: `/community/c/apresente-se` |
| Landing da comunidade | `/community` | **Redireciona** para `/community/c/comece-por-aqui` |
| URL antiga (categoria) | `/community?category=X` | **Redireciona** para `/community/c/<map(X)>` (ver §5) |
| Detalhe do post | `/community/[postId]` | **Inalterado** (segmento estático `c` não colide) |
| Regras / FAQ | `/community/regras` · `/community/faq` | Páginas estáticas |

Active-state: `pathname.startsWith("/community")` mantém "Comunidade" ativo na nav principal; a `ChannelNav` marca o canal ativo por `slug`.

---

## 5. Mapa de migração (categoria atual → canal novo) — para Fase 5

| Categoria atual | Canal novo (slug) | Observação |
|---|---|---|
| `geral` | `chat-networking` | discussão geral |
| `apresentacoes` | `apresente-se` | 1:1 |
| `duvidas` | `duvidas-gerais` | **convergência** |
| `suporte` | `duvidas-gerais` | **convergência** (many-to-one) |
| `resultados` | `compartilhe-seu-projeto` | 1:1 |
| `projetos` | `projetos-negocios` | 1:1 |
| `avisos` | `comunicados` | vira comunicado oficial |

⚠️ `duvidas` **e** `suporte` convergem para `duvidas-gerais` → o rollback exige a **tabela de backup por `post_id`** (`community_migration_backup`) com o valor original; nunca inferência pelo slug novo (conforme plano mestre §Ajuste-5).

---

## 6. Decisões deste documento (recomendadas — confirmar no gate F1)

- **D1 — Mover post entre canais públicos:** **SIM** entre canais públicos (`member`); **NUNCA** para canal restrito (bloqueado em UI+Action+RLS UPDATE). *(Recomendação.)*
- **D2 — Canais sem comentário:** `comece-por-aqui`, `beneficios`, `cupons-descontos` (broadcast puro). Os demais têm comentários. *(Recomendação — reforçada em RLS de `post_comments`.)*
- **D3 — Lista/slugs/permissões:** as tabelas das §2–§3 são a proposta final. *(Confirmar.)*
- **D4 — Regras/FAQ:** conteúdo **em código** (RSC estático) na Fase 3; edição via `settings` fica como opção futura (não requisito agora). *(Confirmar.)*
- **Ícones:** identificadores string (ex.: `megaphone`) resolvidos por `channel-icon.tsx` na Fase 3 — config `structure.ts` permanece server-safe.

---

## 7. Gate F1 (checklist)

- [x] Todo módulo e canal com propósito claro.
- [x] Zero canal duplicado; módulos (Cursos/Recursos/Apps/Calendário) **não** viraram canais.
- [x] Slugs definidos (§2); permissões definidas (§3); classificação por tipo aplicada (§2).
- [x] Contrato de URLs definido (§4); mapa categoria→canal definido (§5).
- [x] Nenhuma implementação de código/banco realizada.
- [ ] **Aprovação humana** de D1–D4 e do catálogo (§2–§3) — pendente.

*Fim da Fase 1. Próximo passo só após aprovação: Fase 2 (reorganização da navegação, só código).*
