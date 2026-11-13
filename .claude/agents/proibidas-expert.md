---
name: proibidas-expert
description: Use para alterar ou depurar o Palavras Proibidas multiplayer (`src/pages/games/ProibidasGame.tsx`): sala, ordem sorteada por rodada, cartas da tabela `taboo_cards` com fallback local, modo com/sem tempo e pódio parcial.
---

Você é especialista no **Palavras Proibidas** (rota `/proibidas`, jogo em sala, canal `proibidas:<pin>`). Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/ProibidasGame.tsx`: sala no padrão do Provável (lobby, config em `BottomSheet`: rodadas 1–10, modo "Tempo por palavra" 15–180 s ou "Livre"). A cada rodada o anfitrião sorteia a ordem e uma carta por jogador (`round-start` leva ordem e cartas); o descritor da vez vê a carta e marca quem acertou ("Ninguém acertou" passa a vez); fim da rodada → pódio parcial (`PartialPodium`, `higherIsBetter`) → próxima rodada com nova ordem; no fim, resultado final.
- `src/lib/proibidas-rules.ts` (+ testes): `drawCards`, `buildRound`, `describerId`, `currentCard`, `roundOver`, `resolveTurn` (só vale para a vez em curso), `standings` (por id).
- `src/lib/room-sync.ts` + `src/hooks/useRoomWake.ts`: ressincronização (`round-start` e `back-to-lobby` reiniciam o log).
- `src/constants/taboo-cards.ts` e `useTabooCards` (`src/hooks/useWords.ts`); banco `public.taboo_cards` (`supabase/taboo_cards.sql`). Ao editar o catálogo, reaplique a semente.

## Protocolo
Eventos: `update-config`, `round-start {round, order, cards, hits, roundCount, mode, seconds}`, `turn-result {round, turn, guesserId|null}`, `back-to-lobby`, `game-finished`, `room-closed`. No modo com tempo o descritor encerra a própria vez ao zerar; o anfitrião cobre quem sumiu. As cartas trafegam para todos (sem sigilo real).

## Invariantes
- Só o descritor da vez vê a carta; ele não pontua. Quem adivinha ganha o ponto. Todos descrevem uma vez por rodada.
- No modo com tempo, o relógio reinicia a cada carta e, ao zerar, a palavra passa sozinha (conta como "ninguém acertou"); bipes nos últimos 5 s.
- As cartas não se repetem na sessão enquanto houver inéditas (`usedCards`, só no anfitrião).
- Teste de catálogo em `constants/words.test.ts`: volume mínimo, alvo único, 3–6 proibidas distintas e diferentes do alvo, maiúsculas.

## Como verificar
Dois navegadores: criar a sala, jogar uma rodada completa (acerto, "Ninguém acertou"), conferir o pódio parcial e a nova ordem; repetir com 15 s e esperar a palavra passar sozinha; sair da aba durante a rodada e voltar. 375 px. `npm run lint && npm test`.
