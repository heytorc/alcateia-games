# 🐺 Alcateia Games

Hub de jogos rápidos, mobile-first e instalável como PWA. SPA em React publicada no GitHub Pages; multiplayer via Supabase Realtime, sem banco de dados. Descrição de jogos, setup e deploy: ver `README.md`.

## Comandos
- `npm run dev`: Vite em `0.0.0.0:5173` (`strictPort`; falha se a porta estiver ocupada). URL local: `/alcateia-games/`.
- `npm run lint`: typecheck (`tsc -p tsconfig.app.json --noEmit`; inclui `noUnusedLocals`, então imports não usados falham). `npm run build`: `tsc -b` + `vite build`. `npm run preview`: serve o build.
- `npm test`: Vitest. Um arquivo: `npx vitest run src/lib/utils.test.ts`.

## Stack
React 18 + TypeScript + Vite · Tailwind v4 + shadcn/ui (`radix-ui`) · React Router 7 · Zustand (`persist`) · Supabase Realtime · `motion` · `canvas-confetti` · Zod · `emoji-picker-react` · `vite-plugin-pwa`.

## Jogos
| id (`GameId`) | Rota | Arquivo | Modo | Canal Realtime | Agente |
|---|---|---|---|---|---|
| `letters` | `/letters` | `src/pages/games/LettersGame.tsx` | local | – | `letters-game-expert` |
| `weight` | `/weight` | `src/pages/games/WeightGame.tsx` | local | – | `weight-game-expert` |
| `number` | `/number` | `src/pages/games/NumberGame.tsx` | local | – | `number-game-expert` |
| `password` | `/password` | `src/pages/games/PasswordGame.tsx` | local | – | `password-game-expert` |
| `impostor` | `/impostor` | `src/pages/games/ImpostorGame.tsx` | multi | `impostor:<pin>` | `impostor-game-expert` |
| `time` | `/time` | `src/pages/games/TimeGame.tsx` | multi | `time-game:<pin>` | `time-game-expert` |
| `campo-minado` | `/campo-minado` | `src/pages/games/CampoMinadoGame.tsx` | multi | `campo-minado:<pin>` | `campo-minado-expert` |

`src/pages/games/MineswecherGame.tsx` é um jogo em construção (sem rota, ignorado pelo git e excluído do `tsconfig.app.json`); não o trate como parte do app.
Agentes transversais: `realtime-expert` (Supabase/salas) e `ui-ux-expert` (visual e a11y). Ficam em `.claude/agents/`.

## Arquitetura
- **Registro de jogos:** `GameId` e a lista `games` em `src/constants/games.ts` (home e cards; a ordem do array é a ordem dos cards na Home: letras, peso, número, tempo certo, impostor, mega senha e, por último, campo minado); rotas em `src/App.tsx`. Os dois precisam andar juntos.
- **Estado:** `src/lib/store.ts` (Zustand persistido em `localStorage`, chave `alcateia-games`): perfil, avatares, `transition` (animação de troca de página), `soundEnabled`, `settings`, histórico da Mega Senha e `lastRoomID`/`lastGameType` (reconexão à sala).
- **Realtime:** `src/lib/realtime.ts` exporta `supabase` ou `null` quando faltam `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`; todo jogo multiplayer deve tratar `null`. Sala = PIN em `?pin=`; Presence para jogadores, Broadcast para eventos. `src/components/games/RoomDirectory.tsx` lista salas abertas via Presence em `rooms:<game>`.
- **Sorteios:** helpers puros em `src/lib/utils.ts` (`drawUnique*`, `drawManyUnique`, `createRoomPin`, formatadores; também reexporta `cn`), cobertos por `src/lib/utils.test.ts`. Catálogos em `src/constants/` (`games.ts`, `impostor-words.ts`, `password-words.ts`). Regras puras do Campo Minado em `src/lib/campo-minado-rules.ts`; sons em `src/lib/audio.ts`.
- **Componentes:** `@/components` (barrel em `components/index.ts`) para domínio; `components/games/` (`GameButton`, `GameCard`, `GameLayout`, `History`, `WolfFieldLobby`, `DrawStage`, `JoinRoomDialog`, `RoomDirectory`…); `components/ui/` são primitivos shadcn. Painéis e controles: `BottomSheet` (painel que sobe da base, com cabeçalho/rodapé fixos e área segura; use no lugar de `Dialog` para formulários longos: perfil, configurações de sala), `NeonSlider`, `IconCounter` (−/+ com fila de ícones animada). Outros: `ScrollToTop` (botão flutuante "voltar ao topo", montado no `Shell`), `TransitionPicker` (perfil), `ErrorPage`/`ErrorBoundary`. Hooks em `src/hooks/` (`useMediaQuery`, `useOnline`, `useRestoreRoom`).
- **Estrutura de `src/`:** a raiz só tem `main.tsx`, `App.tsx`, `styles.css` e `vite-env.d.ts`. `pages/` (telas), `components/`, `hooks/`, `lib/` (store, realtime, audio, regras, utils), `constants/` (catálogos). Não crie arquivos soltos na raiz.

## Convenções
- Alias `@/` → `src/`. Importe animações de `motion/react` (`framer-motion` não é dependência).
- **Visual (Neon Arcade):** `src/styles.css` é a fonte da verdade (`:root` shadcn + `@theme inline`; utilitários `.neon-box`, `.neon-text`, `.neon-grid`, `.scanlines`, `.blink`). Fontes: `Share Tech Mono` (corpo), `Silkscreen` (títulos/números, `.font-game-pixel`). Transição de rota em `App.tsx` + `components/transitions/PageTransition.tsx` (sete variantes; a escolhida fica em `transition` no store, definida em `TransitionPicker` no diálogo de perfil; ids e padrão em `constants/transitions.ts`). Lobby: `WolfFieldLobby` (campo noturno com um lobo por jogador; GIFs em `public/wolves/`, copiados de `wolf-rpg/`, pasta local fora do git; usado em Impostor e Tempo Certo). Telas de sala: `room-styles.ts` (classes comuns), `JoinRoomDialog` (entrar por PIN) e `useRestoreRoom` + `createRoomPin` (PIN/reconexão); não copie esses trechos para o jogo novo. Tempo Certo: `DigitalTimer` (painel LED de sete segmentos em SVG, que é o botão de iniciar/parar) e `PartialPodium` (pódio parcial animado entre rodadas). Mega Senha: `ChannelKnob` (seletor de canais rotativo que sorteia a rodada) na `TvFrame`. Sorteio local: `DrawStage` (botão neon de resultado; a fonte se ajusta ao número de caracteres, e `.neon-on` precisa manter o padding/margem negativa que dá folga ao brilho, senão o `filter` o corta). Saída da sala: nunca com botões na tela; o `GameHeader` recebe `leave={{ host, onConfirm }}` e mostra o botão de porta (e a seta de voltar) que abre um diálogo de confirmação ("Encerrar sala" para o anfitrião, "Sair da sala" para os demais). Sala: `RoomPlayers` (ícone com contador + drawer, via prop `room` do `GameHeader`), `PlayerList` e `RoomPin`. Botões: use `GameButton`, cores em `--btn-*` (`styles.css`), sempre com borda neon e hover por opacidade do fundo. Papéis: `game` rosa = ação principal (uma por grupo); `info` ciano = alternativa (entrar na sala, nova rodada); `special` roxo = neutra (cancelar, sair, voltar, item não selecionado); `warning` amarelo = resultado (ver pódio); `danger` vermelho = só destrutiva (encerrar sala); `success` verde = só estado já ocorrido (pronto, votou), nunca ação. A cor não depende do jogo nem do papel do jogador. Grupos de botões: `GameActions` (coluna no mobile, linha a partir de `sm`; ordem principal, alternativa, neutra, destrutiva) e `GameDialogFooter` nos diálogos; ícone antes do texto, rótulos em sentence-case ("Encerrar sala", "Sair da sala").
- **Erros:** `components/ErrorPage.tsx` tem as cinco telas (`404`, `500`, `offline`, `sala`, `multiplayer`); a rota `*` mostra a 404, `ErrorBoundary` (em `App.tsx`, limpo a cada rota) mostra a 500 com a mensagem do erro, e os três jogos multiplayer usam `offline` (via `useOnline`, só fora da sala), `multiplayer` (sem Supabase) e `sala` (sala encerrada). Use-as em vez de criar telas de erro novas.
- **Responsividade:** mobile-first; teste `max-width: 420px` e `760px`. Respeite `prefers-reduced-motion`.
- Textos de UI e documentação em pt-BR.

## Supabase e segurança
- Só a anon key no frontend; nunca `service_role`. Canais efêmeros, sem tabelas nem RLS envolvidos.
- Os eventos são confiados ao cliente (ex.: a palavra do Impostor e o mapa de bombas do Campo Minado trafegam em broadcast para todos). Não prometa sigilo ou anti-trapaça nesses jogos.
- `.env*` é ignorado, exceto `.env.example`.

## Build, PWA e deploy
- `vite.config.ts` fixa `base: '/alcateia-games/'`; se o repositório for renomeado, ajuste ali.
- `.github/workflows/deploy.yml` roda `lint` e `test`, falha se `vars.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` (Variables do repositório, não Secrets) estiverem vazias, builda com `VITE_SITE_URL` (derivado do dono/repositório), copia `index.html` para `404.html` (fallback da SPA) e publica `dist` no Pages a cada push em `main`.
- **Metadata/PWA:** `index.html` (título, descrição, Open Graph/Twitter, ícones, `apple-mobile-web-app-*`) usa `%SITE_URL%`, preenchido por `vite.config.ts` (`VITE_SITE_URL`, padrão `https://heytorc.github.io/alcateia-games/`). Ativos em `public/`: `logo-wolf.svg` (logo da navbar e das telas de erro, recortado rente ao lobo), `favicon.svg`/`.ico`/`-32.png`, `apple-touch-icon.png` (180), `pwa-192x192.png`, `pwa-512x512.png`, `pwa-maskable-512.png`, `og-image.png` (1200×630, fora do precache). O lobo é um contorno neon (tubo) com degradê vertical rosa→roxo→ciano, derivado de uma ilustração de referência; o `favicon.svg` é vetorial (contornos em traço com degradê) e os PNGs foram gerados por script local a partir do mesmo contorno (mocks e variações em `docs/mocks/`, fora do git). Ao mudar o logo, regere todos os arquivos de `public/`; a ilustração de origem precisa ter licença para uso no projeto. Os links absolutos do OG ficam em cache nas redes sociais: revalide em um debugger de link após mudar a imagem.
- Fora do repositório (`.gitignore`, mas no disco): `wolf-animations/`, `wolf-rpg/` (fonte dos GIFs de `public/wolves/`), `docs/` (experimentos de logo, ícones e mocks) e `MineswecherGame.tsx`.
- PWA com `registerType: 'autoUpdate'`. Para validar: `npm run build && npm run preview`, instalar e testar offline pelo DevTools. Ao mudar rotas ou assets, confirme que os caminhos respeitam o `base`.

## Como adicionar um jogo
1. Incluir o id em `GameId` e a entrada em `games` (`src/constants/games.ts`). 2. Criar a página e registrar a rota em `src/App.tsx`. 3. Se for multiplayer, seguir o padrão de sala/`RoomDirectory` (ver `realtime-expert`) e ampliar a união `game` em `RoomDirectory.tsx` e `lastGameType` em `lib/store.ts`; use `JoinRoomDialog`, `useRestoreRoom` e `createRoomPin`. 4. Criar o agente `.claude/agents/<jogo>-expert.md`. 5. Atualizar a tabela acima e o `README.md`.

## Testes
Só há testes de utilitários (`lib/utils.test.ts`), das regras do Campo Minado (`lib/campo-minado-rules.test.ts`) e do catálogo de palavras. Lógica de jogos e Realtime não têm cobertura: valide manualmente (dois navegadores/abas para multiplayer) e rode `npm run lint && npm test` antes de concluir.
