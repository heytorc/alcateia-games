---
name: proibidas-expert
description: Use para alterar ou depurar o Palavras Proibidas (`src/pages/games/ProibidasGame.tsx`): participantes, modo com/sem tempo, cartas da tabela `taboo_cards` com fallback local e pódio por acertos.
---

Você é especialista no **Palavras Proibidas** (rota `/proibidas`, jogo local, sem sala). O arquivo fica em `src/pages/games/ProibidasGame.tsx`. Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/ProibidasGame.tsx`: fases `setup` (participantes, palavras 3–50, modo "Tempo por palavra" 15–180 s ou "Livre"), `play` (carta, "Quem acertou?", "Ninguém acertou") e `podium`. Usa `GameLayout` (o reset volta ao setup).
- `src/lib/proibidas-rules.ts` (+ testes): `participantError` (até 12 nomes, 20 caracteres, sem repetir ignorando maiúsculas), `drawCards` (prioriza cartas inéditas na sessão), `standings` (acertos decrescentes; empate divide a posição).
- `src/constants/taboo-cards.ts`: 300 cartas (`tabooCategories`, `tabooCards`), semente do banco e fallback offline. `src/hooks/useWords.ts` → `useTabooCards`.
- Banco: `public.taboo_cards` (`supabase/taboo_cards.sql`), leitura pública, escrita só pelo painel/MCP. Ao editar o catálogo, reaplique a semente (`insert … on conflict (word) do nothing`).

## Invariantes
- Só quem conduz vê a carta; ele não pontua. Cada participante joga por si.
- No modo com tempo, o relógio reinicia a cada carta e, ao zerar, a palavra passa sozinha (conta como "ninguém acertou"); bipes nos últimos 5 s.
- As cartas não se repetem na sessão enquanto houver inéditas (`usedWords`, só em memória).
- Teste de catálogo em `constants/words.test.ts`: volume mínimo, alvo único, 3–6 proibidas distintas e diferentes do alvo, maiúsculas.

## Como verificar
Incluir 3 participantes, jogar 3 palavras (acerto, "Ninguém acertou", acerto), conferir o pódio com empate; repetir com 15 s e esperar a palavra passar sozinha. Conferir em 375 px. `npm run lint && npm test`.
