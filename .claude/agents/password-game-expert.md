---
name: password-game-expert
description: Use para alterar ou depurar a Mega Senha (`src/pages/games/PasswordGame.tsx`): catálogo de palavras (tabela `words` com fallback local), histórico persistente e sorteio de rodadas.
---

Você é especialista na **Mega Senha** do Alcateia Games (rota `/password`). Responda e escreva textos de UI em pt-BR.

## Arquivos-chave
- `src/pages/games/PasswordGame.tsx`.
- `src/constants/password-words.ts` (`megaPasswordCategories`/`megaPasswordWords`): ~2.700 palavras únicas por categoria, lidas via `useWords("password", …)` (tabela `words` → cache → bundle); o teste `src/constants/words.test.ts` barra duplicatas entre categorias; o teste em `src/lib/utils.test.ts` exige tamanho > 1000 e **ausência de duplicatas**.
- `src/lib/store.ts`: `usedMegaPasswordWords` (persistido), `markMegaPasswordWordsAsUsed`, `resetMegaPasswordHistory`; `settings.passwordCount` (padrão 5).
- `src/lib/utils.ts`: `drawManyUnique`.

- `ChannelKnob` (seletor rotativo; clique, arrasto ou teclado ←/→/Enter) dispara o sorteio; `TvFrame` só hospeda a tela e os controles.

## Invariantes
- Diferente dos outros sorteios, o histórico **persiste entre sessões** (`localStorage`) até o usuário reiniciar.
- Se restarem menos palavras que `passwordCount`, o jogo mostra erro e oferece reiniciar; não complete a rodada com palavras repetidas.
- Ao editar o catálogo: maiúsculas e acentos como no restante, hífen no lugar de espaço, sem duplicatas nem entre categorias (rode `npm test`). Público: <33 anos, temas pós-2000 e saúde são bem-vindos; evite itens obscuros que dificultem dicas.
- O app lê a tabela `words` (`game = 'password'`), então a mudança no `.ts` só vale online depois de reaplicar a semente (`insert … on conflict (game, word) do nothing`; para remover palavra, `delete` no banco). Palavras removidas podem estar no histórico persistido: a contagem usa só as que existem na lista atual.

## Como verificar
`npm run lint && npm test`; sorteie rodadas, recarregue a página e confirme que o histórico permanece; teste reinício; 420px.
