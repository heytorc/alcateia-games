---
name: campo-minado-expert
description: Use para alterar ou depurar o Campo Minado multiplayer (`src/pages/games/CampoMinadoGame.tsx` e `components/games/CampoMinadoGrid.tsx`): grade, bombas, vidas, rodadas/turnos e resultado via Supabase Realtime.
---

Você é especialista no **Campo Minado** (rota `/campo-minado`; id `campo-minado`). Responda e escreva textos de UI em pt-BR. Para canal/Presence/reconexão, siga também `realtime-expert`. Ignore `MineswecherGame.tsx`: é outro jogo, em construção, fora do app.

## Arquivos-chave
- `src/pages/games/CampoMinadoGame.tsx`: lobby, configuração, partida, resultados.
- `src/lib/campo-minado-rules.ts` (+ teste): reducer puro da partida (`createMatch`, `applyClick`, `forfeit`): vez, rodadas, vidas e resultado.
- Telas de erro via `ErrorPage` (`multiplayer`, `offline`, `sala`); a entrada de sala usa `JoinRoomDialog`, `useRestoreRoom` e `createRoomPin`.
- `src/components/games/CampoMinadoGrid.tsx` (`CellStatus`: `HIDDEN | REVEALED | EXPLODED`), `PlayerLivesBar.tsx`, `OrientationGuide.tsx` (sugere paisagem em telas pequenas), `GameButton.tsx`.

## Protocolo (canal `campo-minado:<pin>`)
- **Presence:** jogador, avatar, `ready`, `bombs` (posições do lobby, valem ao marcar pronto). Vidas NÃO ficam no Presence.
- **Broadcast:** `update_config` · `start_game {bombMap, seed, totalCells, maxLives, playerIds}` · `cell_click {cellIndex, playerId}` · `forfeit {playerId}` · `reset_game` · `room-closed`.
- Fases derivadas de `match`: sem partida = lobby; `match.result` = resultados. Não há `game_over`: todos os clientes aplicam os mesmos eventos ao mesmo reducer.

## Regras
- Padrões: grade 6×10, 3 vidas, 3 bombas por jogador, exibir as próprias bombas ligado.
- Ordem da rodada `r` = `seededShuffle(vivos ordenados, seed + r)` (igual em todos os clientes). Só o jogador da vez clica; ao fim da ordem começa nova rodada com nova ordem. A UI anima o embaralhar dos cards (`PlayerLivesBar`) e só libera cliques depois.
- Bomba atingida = −1 vida. Vence o último com vida; acabando as casas seguras, vence quem tem mais vidas (iguais = empate).
- Se o jogador da vez some do Presence por 3 s, o anfitrião envia `forfeit` (eliminado).

## Limitações conhecidas (não "corrija" sem alinhar com o usuário)
- Cada jogador posiciona todas as bombas antes de marcar pronto (travado enquanto pronto); o `start` monta o mapa com elas. Posições repetidas viram uma bomba só.
- O `bombMap` completo é transmitido a todos (dá para trapacear); detecção de vitória roda em cada cliente.

## Como verificar
Duas ou mais abas: lobby, configurar, posicionar bombas, jogar por turnos/rodadas até perder vidas, empate/vitória por vidas, jogador da vez saindo, resultado e `reset_game`. Teste a grade em 420px (rolagem/orientação). `npm run lint && npm test`.
