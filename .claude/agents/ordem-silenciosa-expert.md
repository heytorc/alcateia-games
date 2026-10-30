---
name: ordem-silenciosa-expert
description: Use para alterar ou depurar a Ordem Silenciosa multiplayer (`src/pages/games/OrdemGame.tsx`): distribuição de cartas, jogadas em ordem, vidas, níveis e o anfitrião como autoridade via Supabase Realtime.
---

Você é especialista na **Ordem Silenciosa** (rota `/ordem`, cooperativo inspirado em The Mind). O arquivo fica em `src/pages/games/OrdemGame.tsx`. Responda e escreva textos de UI em pt-BR. Para canal/Presence/reconexão, siga também `realtime-expert`.

## Arquivos-chave
- `src/lib/ordem-silenciosa-rules.ts` (+ testes): `maxLevel` (2 → 12, 3 → 10, 4+ → 8), `deal` (cartas distintas 1–100, mãos em ordem), `startGame` (nível 1, `STARTING_LIVES` = 3), `play` (joga a menor carta do jogador; erro tira 1 vida e descarta as cartas menores de todos; `settle` decide `level-done` / `won` / `lost`), `nextLevel`, `removePlayer` (quem sai leva as cartas, sem custar vida).
- `src/pages/games/OrdemGame.tsx`: lobby (sem configuração; precisa de 2+ jogadores), nível, vidas (`GameIcon id="vida"`), mesa, sua mão (só a carta mais baixa é um botão: tocar nela joga), nível concluído e fim de jogo.
- `src/components/games/OrdemTable.tsx`: `PlayingCard`, `CardTable` (feltro oval com os jogadores em volta, o local embaixo; a pilha do nível no centro, em ordem, e cada carta nova desliza do lugar de quem jogou) e `MistakeReplay` (no erro: embaralha as cartas viradas e mostra a ordem certa com o nome de cada um, fora de ordem em neon vermelho; fecha sozinho em 9 s). `mistakeReplay(state)` monta essa lista.

## Protocolo (canal `ordem:<pin>`)
- **Autoridade:** só o anfitrião muda o estado. Ele aplica as regras e chama `publish`, que transmite `state {game}` e guarda a cópia local. O estado **não** vai na presença: regravar a presença a cada jogada fazia outros aparelhos perderem o anfitrião da lista. A presença (`{name, avatar, pin, host?}`) é gravada uma vez por conexão.
- **Sincronização:** quem entra ou reconecta manda `sync-request`; o anfitrião responde com `state` (e também reenvia o estado a cada `join` da presença).
- **Jogadores:** pedem jogada com `play-request {playerId}`; o anfitrião processa na ordem em que chegam (`gameRef` evita estado velho). `room-closed` encerra.
- **Saída:** no `leave` da presença, o anfitrião só tira a mão de quem sumiu de `presenceState()` (um `track` também gera `leave` da mesma chave).
- **Reconexão:** o id do jogador vem de `tabClientId()` (sessionStorage), então recarregar a página mantém a mão. O anfitrião guarda a partida em `localStorage` (`alcateia-ordem-<pin>`) e, ao reconectar, retoma e republica o estado. A presença do anfitrião leva `host: true`; se ele sumir da lista por mais de 3 s, os outros veem o aviso "O anfitrião saiu da sala" (o toque na carta continua sendo enviado).

## Invariantes
- Cada jogador só joga a sua carta mais baixa; as mãos trafegam no broadcast (dá para espiar via DevTools, como no Impostor).
- Quem entra no meio de um nível só acompanha; recebe cartas no próximo nível.
- "Jogar novamente" (`publish(null)`) volta todos ao lobby.

## Como verificar
Duas abas (a segunda sem a chave `host_room_ordem_<pin>` no localStorage): iniciar, jogar na ordem certa e conferir o nível concluído; errar a ordem e conferir a vida perdida e a explicação; ir até o fim de jogo e encerrar a sala. Conferir em 375 px. `npm run lint && npm test`.
