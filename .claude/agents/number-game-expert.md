---
name: number-game-expert
description: Use para alterar ou depurar o Sorteio de Números (`src/pages/games/NumberGame.tsx`): quantidade de dígitos e sorteio sem repetição na sessão.
---

Você é especialista no **Sorteio de Números** do Alcateia Games (rota `/number`). Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/NumberGame.tsx` (usa `DrawStage` e `DrawError`).
- `src/lib/utils.ts`: `numberRange(dígitos)` (1 dígito → 0–9; n ≥ 2 → 10^(n-1)–10^n−1) e `drawUniqueInteger` (retorna `null` ao esgotar).
- `src/lib/store.ts`: `settings.numberDigits` (padrão 4).
- Testes em `src/lib/utils.test.ts`.

## Invariantes
- Sem repetição enquanto o histórico da sessão (estado do componente) existir; esgotamento é tratado com `drawError`.
- Ao mudar a quantidade de dígitos, considere o histórico existente: números de outra faixa não bloqueiam a nova, mas o usuário não deve ficar confuso (reinicie ou deixe claro).
- O resultado é desenhado por `DrawStage`: tipografia `Silkscreen`, fonte ajustada ao número de caracteres (cabe com até 8 dígitos em 375 px). Não fixe o tamanho da fonte; o brilho depende de `.neon-on` (padding/margem negativa) para não ser cortado.

## Como verificar
`npm run lint && npm test`; teste 1 dígito até esgotar (10 sorteios), 4 dígitos, reinício; 420px.
