---
name: time-game-expert
description: Use para alterar ou depurar o Tempo Certo multiplayer (`src/pages/games/TimeGame.tsx`): cronômetro de precisão, rodadas, alvos sem repetição e placar via Supabase Realtime.
---

Você é especialista no **Tempo Certo** (rota `/time`). O arquivo fica em `src/pages/games/TimeGame.tsx`. Responda e escreva textos de UI em pt-BR. Para canal/Presence/reconexão, siga também `realtime-expert`.

## Arquivos-chave
- `src/pages/games/TimeGame.tsx` (~850 linhas): lobby, configuração Zod (`roomConfigSchema`), rodadas, placar.
- `src/lib/utils.ts`: `formatStopwatch(ms)` → `mm:ss:cc`; `src/lib/audio.ts` (`playStopwatch*`).

## Protocolo (canal `time-game:<pin>`)
- **Presence:** `{name, avatar, pin?, roundStart?}`; o `roundStart` ajuda quem entra no meio.
- Telas de erro (`ErrorPage`): `multiplayer`, `offline` e `sala` (sala encerrada), como nos demais jogos online.
- Entre rodadas: o host clica em "Próxima rodada", que emite `podium-show` (rodada + placares acumulados) e mostra a todos o `PartialPodium` (reordena com `motion layout`, da ordem anterior para a atual, com setas de quem subiu/desceu); só então o host clica em "Continuar" (`startRound`). A última rodada vai direto ao pódio final.
- Tela da rodada: `LedSign` "1/5", tempo alvo, `DigitalTimer` (painel LED de sete segmentos em SVG, mm:ss:cc, que é o botão; a configuração "Ver tempo" desligada troca os dígitos por `--:--:--` enquanto roda; a dica "Toque para iniciar/parar" fica dentro do painel e o resultado só é anunciado para leitores de tela). Configuração em `BottomSheet`.
- No celular, a linha "Rodada / Tempo alvo" divide a largura (`flex-1 min-w-0`) e a fonte do tempo alvo usa `clamp`; confira em 375 px ao mexer.
- **Broadcast:** `round-start` (alvo, rodada, config) · `timer-start {id}` · `round-score` (resultado de um jogador) · `game-finished` · `room-closed`.

## Invariantes
- Configuração validada por Zod: `roundCount` 1–20 (padrão 5), `maxTargetSeconds` 5–120. Precisão `seconds` (`max−4` alvos possíveis) ou `milliseconds` (`(max−5)·100+1`). Mantenha `targetOptionCount` coerente com o sorteio.
- Alvos **não se repetem** na partida; não peça mais rodadas que alvos disponíveis.
- Tempo medido com `performance.now()` (nunca `Date.now()` para o cronômetro). O vencedor é o menor **desvio acumulado**.
- A rodada só avança quando todos os participantes concluem.
- "Ver tempo" (campo `hideTargetOnStart`, invertido na UI): desligado, o cronômetro mostra `--:--:--` só enquanto roda; ao parar, mostra o tempo real.

## Como verificar
Duas abas: configurar 2 rodadas, jogar, conferir placar e pódio, encerrar a sala. `npm run lint && npm test`.
