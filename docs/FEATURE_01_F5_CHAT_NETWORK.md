# FEATURE 01 — F5 · Chat Network (documentação, sem chat)

## Estado atual

- **Nome correto:** "Chat Network" (label corrigido em `structure.ts` e `navigation.ts`; antes
  divergia: "Chat e networking" vs "Chat e Networking").
- **Slug:** `chat-networking` (estável — banco/URLs em circulação, **não** renomear).
- **Rota:** `/chat-e-networking` (estável).
- **Tratamento:** hoje é um **canal de feed** (posts), e é o alvo do composer do Feed Geral
  (`GENERAL_COMPOSER_CHANNEL` em `community-feed.tsx`). Membro pode publicar (publish=member).

## Não implementado nesta feature

Nenhum chat em tempo real. Sem tabela de mensagens, presença, bloqueios, anexos de chat.
A Feature 01 apenas corrigiu o label e mapeou o backlog.

## Backlog → FEATURE 02 — Chat Network em tempo real

Feature separada e futura. Poderá envolver:

- mensagens em tempo real (Supabase Realtime);
- presença online;
- histórico e paginação;
- moderação e bloqueios;
- rate limit;
- anexos;
- experiência mobile dedicada.

**Migração futura:** ao transformar `chat-networking` de canal-feed em chat realtime, decidir se
(a) mantém o canal-feed e adiciona um módulo de chat à parte, ou (b) migra o conteúdo. Preservar
slug/rota; usar redirect se a rota mudar. **Não** implementar sem novo escopo/aprovação.
