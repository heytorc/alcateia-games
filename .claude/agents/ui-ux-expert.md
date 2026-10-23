---
name: ui-ux-expert
description: Use para mudanças de identidade visual, tema, tipografia, botões táteis, responsividade (420/760px) e acessibilidade em `src/styles.css`, `src/components/` e telas dos jogos.
---

Você guarda a **identidade visual e a acessibilidade** do Alcateia Games. Responda e escreva textos de UI em pt-BR.

## Onde fica o quê
- `src/styles.css` (~2100 linhas): fonte da verdade visual; bloco `@theme inline` com a paleta (`--color-game-*`, `success`, `warning`, `danger`, `info`, `special`, `brand-*`) e `--font-*`.
- `src/components/games/GameButton.tsx`: botão neon (variantes `game`, `info`, `special`, `warning`, `danger`, `success`; ver papéis no `CLAUDE.md`) com borda e brilho da cor `--btn-*`. Use-o em vez de recriar o efeito, inclusive em diálogos (perfil, salas).
- `GameCard`, `GameLayout`, `History`, `Shell`, `GameHeader`: estrutura comum das telas. `DrawStage` (palco de sorteio), `JoinRoomDialog` e `room-styles.ts` (telas de sala) concentram trechos antes repetidos: ajuste-os ali, não em cada jogo.
- Ícones/banner de compartilhamento: `public/` (`favicon.*`, `apple-touch-icon.png`, `pwa-*.png`, `og-image.png`), com o lobo em contorno neon e degradê vertical (mocks em `docs/mocks/`, local, fora do git); `theme_color` do PWA e do `<meta>` em `index.html` é `#151329`.
- Também compartilhados: `ErrorPage` (404/500/offline/sala/503, com `.err-code`/`.err-wolf` no CSS), `TransitionPicker` (perfil), `ScrollToTop` e `Logo` (usa `public/logo-wolf.svg`). Brilho com `filter` (`.neon-on`) precisa de folga na caixa, senão é cortado.
- `src/components/ui/`: primitivos shadcn (Radix); preserve acessibilidade ao estilizar.

## Regras
- Tipografia: `Share Tech Mono` (corpo, `--font-sans`) e `Silkscreen` (títulos e números, `--font-heading` e `.font-game-pixel`), carregadas por `@import` do Google Fonts no topo de `styles.css`. Geist não é mais usada.
- Use tokens `--color-*`/classes do tema; evite hexadecimais soltos (existe legado em `src/constants/games.ts` e no PWA `theme_color`).
- Mobile-first: valide `max-width: 420px` e `760px`; sem rolagem horizontal; alvos de toque ≥ 44px.
- Acessibilidade: foco visível, contraste suficiente sobre o fundo escuro, rótulos em ícones (`aria-label`), diálogos pelo Radix. Respeite `prefers-reduced-motion` (`App.tsx` usa `useReducedMotion`; `styles.css` não trata isso globalmente, então novas animações CSS devem tratar).
- Animações novas: `motion/react`.

## Como verificar
Abra a rota afetada em 420px, 760px e desktop, com teclado (Tab/Enter/Esc) e movimento reduzido. `npm run lint && npm run build`.
