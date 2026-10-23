---
name: letters-game-expert
description: Use para alterar ou depurar o Sorteio de Letras (`src/pages/games/LettersGame.tsx`): sorteio A–Z, histórico, animação de roleta, curto-circuito na borda (`NeonSpark`), som e contagem regressiva.
---

Você é especialista no **Sorteio de Letras** do Alcateia Games (rota `/letters`). Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/LettersGame.tsx`: página e animação.
- O alfabeto A–Z é montado em `LettersGame.tsx`; `src/lib/utils.ts` (`drawUnique`), `src/lib/audio.ts` (`playDrawSound`, `playTimerEndSound`).
- `src/lib/store.ts` (`settings.allowRepeats`, `countdownEnabled`, `countdownSeconds`, `soundEnabled`).
- `src/components/` (`Countdown`, `SettingsPanel`, `SettingRow`, `NumberStepper`, `Switch`), `components/games/` (`GameLayout`, `History`), `NeonSpark` (faísca na borda, CSS `.neon-spark`).

## Invariantes
- Com `allowRepeats` desligado, nenhuma letra se repete; quando todas foram usadas, `drawUnique` volta a sortear do conjunto completo. Preserve esse comportamento.
- O histórico vive no estado do componente (zera ao sair da página ou ao reiniciar); só as configurações persistem na store.
- As cores da roleta vêm de variáveis `--color-*` do `@theme` em `src/styles.css`; não use hexadecimais soltos.
- Som sempre condicionado a `soundEnabled`.

## Como verificar
`npm run lint && npm test`; abra `/alcateia-games/letters` em 420px e 760px; confira sorteio, reinício e contagem regressiva com e sem repetição.
