---
name: number-game-expert
description: Use para alterar ou depurar o Cofre (`src/pages/games/NumberGame.tsx`, id `number`): sala multiplayer, código secreto, tentativas, modos de acertos, letreiro LED e animação de abertura.
---

Você é especialista no **Cofre** do Alcateia Games (rota `/number`, id `number`; antes era o Sorteio de Números). Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/NumberGame.tsx`: sala (canal `number:<pin>`, `RoomDirectory`, `JoinRoomDialog`, `useRestoreRoom`), lobby com `WolfFieldLobby`, partida e fim. Config da sala (`BottomSheet`): dígitos (3–8) e acertos `shared` (padrão) ou `individual`.
- `src/lib/cofre-rules.ts` (+ testes): `drawCode`, `scoreGuess`, `createVault`, `applyGuess` (qualquer jogador, a qualquer momento; guarda `ms` e converge para a resposta certa mais rápida), `formatElapsed`, `visibleAttempts`, `revealedDigits`, `digitScores`.
- `src/components/games/CofreFrame.tsx` (letreiro LED + teclado + porta que gira mostrando o tesouro) e `LedDigits.tsx` (`LedDigit`, tons verde/vermelho/âmbar; também usado pelo `DigitalTimer`).
- `src/lib/room-sync.ts` + `src/hooks/useRoomWake.ts`: ressincronização (log de eventos: `start` e `back-to-lobby` reiniciam).
- Rua da Home: lote `banco` em `lib/city-scene.ts` e `components/games/city-draw.ts`.

## Protocolo
Eventos: `update-config`, `start {code, digits, mode, startedAt, playerIds, livesEnabled, lives}`, `guess {playerId, guess, ms}`, `back-to-lobby`, `room-closed`. O anfitrião sorteia o código e a largada (`startedAt`); não há fila de vez; todos aplicam as mesmas regras puras. O código trafega para todos (sem sigilo real, como nos demais jogos).

## Invariantes
- Vidas por participante são opcionais (desligadas por padrão, 1–10): cada combinação errada tira uma vida (`livesLeft`, `isOut`); sem vidas o jogador fica travado; se todos zeram sem ninguém abrir, `exhausted` encerra a partida mostrando o código.
- Dígitos acertados ficam verdes e fixos; os errados ficam vermelhos piscando por ~1,6 s e somem, com `playFailSound`. Contador de tempo até abrir; o pódio mostra o tempo de quem abriu (`note` do `PartialPodium`). No modo individual, histórico e acertos mostram só os do próprio jogador.
- Pódio por dígitos acertados (compartilhado: quem acertou a posição primeiro); no empate, quem abriu o cofre fica na frente.
- Respeite `prefers-reduced-motion` na abertura do cofre.

## Como verificar
`npm run lint && npm test`; dois navegadores: digitação simultânea, acerto/erro, histórico, abertura e pódio; 420px.
