# 🐺 Alcateia Games

Hub de jogos rápidos, mobile-first e instalável como PWA, no estilo "Neon Arcade" (pixel art, bordas neon e botões táteis). Publicado no GitHub Pages: <https://heytorc.github.io/alcateia-games/>.

## Jogos

- **Sorteio de letras:** histórico em grade, cores alternadas, animação, curto-circuito na borda, som de roleta e contagem regressiva opcional com campainha ao terminar.
- **Sorteio de peso:** faixa configurável, seletor entre gramas e quilos e resultados sem repetição na sessão ativa.
- **Sorteio de números:** quantidade de dígitos configurável e resultados sem repetição na sessão ativa.
- **Mega senha:** sorteia palavras únicas do catálogo local e preserva o histórico entre sessões até ser reiniciado.
- **Impostor:** sala multiplayer com uma palavra secreta, um impostor por rodada, votação, nova rodada pelo anfitrião e encerramento da sala.
- **Tempo certo:** sala multiplayer em que cada participante inicia e pausa seu cronômetro para atingir o tempo alvo. O desvio acumulado decide o pódio final; o anfitrião define rodadas, tempo máximo, precisão e desfoque opcional do cronômetro.
- **Campo minado:** sala multiplayer em grade (padrão 6×10) em que os jogadores têm vidas e revelam casas por turnos, em rodadas com ordem sorteada a cada rodada; cada bomba atingida custa uma vida. Vence o último com vida; se as casas seguras acabarem com mais de um vivo, vence quem tiver mais vidas (iguais = empate). O anfitrião configura grade, vidas e bombas. _Em evolução:_ hoje o mapa de bombas é montado pelo anfitrião (com sorteio para os demais) e transmitido a todos.

## Perfil e salas

A tela inicial exibe a configuração de perfil até o nome ser definido. Depois disso, nome e avatar ficam disponíveis na navbar e podem ser editados por um diálogo, que também define a transição de página. Além dos avatares sugeridos, o seletor permite escolher emojis personalizados e mantém os últimos 24 emojis únicos usados no armazenamento local.

Os jogos Impostor, Tempo certo e Campo minado usam esse perfil automaticamente ao entrar em uma sala.

As salas abertas aparecem na tela de entrada de cada jogo multiplayer enquanto o anfitrião permanece no lobby. A descoberta acontece por Presence no Supabase Realtime (canal `rooms:<jogo>`), sem banco de dados adicional. Uma sala é identificada por um PIN, também aceito na URL (`?pin=`), e o app lembra a última sala para reconectar.

## Transição de página

Ao trocar de rota, um overlay neon cobre a tela e a nova página aparece por baixo dele. Há sete variantes (código em `src/components/transitions/PageTransition.tsx`, ids em `src/constants/transitions.ts`, estilos `.fx-*` em `src/styles.css`). O padrão é `laser`.

| id | Efeito |
|---|---|
| `line` | Linha rosa trava no centro e expande na horizontal até a tela toda |
| `netflix` | Fitas de luz em leque e um “A” que atravessa a tela, como a abertura da Netflix |
| `tunnel` | Túnel de grade synthwave |
| `sign` | Letreiro neon piscando com flash RGB |
| `laser` (padrão) | Varredura laser da esquerda para a direita |
| `blinds` | Persianas com borda neon |
| `static` | Chuvisco de TV (a transição anterior) |

A escolha é feita no diálogo de perfil (clique no seu nome na navbar > "Transição de página") e fica salva no navegador (`localStorage`, chave `alcateia-games`, campo `transition`). Como atalho de desenvolvimento, `?fx=<id>` na URL (por exemplo `http://localhost:5173/alcateia-games/?fx=netflix`) também define a transição e `?fx=default` volta ao padrão. Para mudar o padrão do app, edite `DEFAULT_TRANSITION` em `src/constants/transitions.ts`. Com `prefers-reduced-motion` ativo, não há overlay, só um fade curto.

## Telas de erro

A rota inválida mostra a página 404, e um erro de execução em qualquer tela cai na página 500 (com a mensagem técnica). Os jogos multiplayer exibem as telas de offline, multiplayer indisponível (sem Supabase configurado) e sala encerrada. Componente: `src/components/ErrorPage.tsx`.

## Persistência local

Perfil, avatares personalizados, transição de página, configurações, preferência de som, histórico da Mega senha e a última sala ficam no `localStorage` (chave `alcateia-games`). Limpar os dados do site reinicia tudo.

## Stack

- **Framework**: React 18 + TypeScript + Vite, com React Router para as rotas
- **Styling**: Tailwind CSS v4 (usando `@theme inline` para paletas customizadas)
- **UI Components**: Shadcn UI (`src/components/ui/`)
- **Typography** (Google Fonts, importadas em `src/styles.css`):
  - `Share Tech Mono` (corpo)
  - `Silkscreen` (títulos e números, estética pixel de jogos: `.font-game-pixel`)
- **Estado**: Zustand para configurações e preferências
- **Realtime**: Supabase Realtime (Presence e Broadcast) para Impostor, Tempo certo e Campo minado
- **Animações**: `motion`
- **Validação**: Zod para configuração de salas
- **Utilitários**: `emoji-picker-react` (avatar personalizado) e `canvas-confetti` (celebrações)
- **PWA**: `vite-plugin-pwa` para manifest e service worker
- **Layout**: mobile-first, testado em larguras de até 420px e 760px

## Estrutura do projeto

```text
src/
  main.tsx, App.tsx, styles.css   entrada, rotas/transição e tema
  pages/            HomePage e pages/games/ (um arquivo por jogo)
  components/       Shell, GameHeader, ErrorPage, diálogos…; games/ (GameButton, DrawStage, JoinRoomDialog, RoomDirectory…); ui/ = shadcn
  hooks/            useMediaQuery, useOnline, useRestoreRoom
  lib/              store (Zustand), realtime (Supabase), audio, utils (+ testes), regras do Campo Minado
  constants/        catálogos: games, palavras do Impostor e da Mega senha
public/             favicon, ícones PWA, og-image, ícones de jogos e GIFs dos lobos
```

Ficam só no disco, fora do repositório (`.gitignore`): `wolf-animations/` e `wolf-rpg/` (fontes dos GIFs de `public/wolves/`), `docs/` (experimentos de logo, ícones e mocks) e `src/pages/games/MineswecherGame.tsx` (jogo em construção, sem rota).

## Compartilhamento e instalação (metadata)

`index.html` define título, descrição, Open Graph e Twitter Card (banner `public/og-image.png`, 1200×630), favicon (`.svg`, `.ico`, `32px`) e `apple-touch-icon`. O manifest do PWA (`vite.config.ts`) usa `pwa-192x192.png`, `pwa-512x512.png` e `pwa-maskable-512.png`, nome curto "Alcateia" e abre em modo standalone.

- Os links de `og:image`/`og:url` precisam ser absolutos: `vite.config.ts` troca `%SITE_URL%` por `VITE_SITE_URL` (o workflow define a partir do dono/repositório; padrão `https://heytorc.github.io/alcateia-games/`). Para testar localmente com outro endereço: `VITE_SITE_URL=https://exemplo.com/ npm run build`.
- Redes sociais guardam a prévia em cache; após trocar o banner, force a atualização no debugger do Facebook/WhatsApp.
- O logo é um lobo em contorno neon com degradê vertical (rosa, roxo e ciano). `favicon.svg` é vetorial e os PNGs foram gerados por script local; mocks e variações ficam em `docs/mocks/` (fora do git). Se o logo mudar, regere os arquivos de `public/`.

## Desenvolvimento local

```bash
npm install
npm run dev
```

O comando de desenvolvimento escuta a rede local. Com todos os dispositivos conectados à mesma rede, abra o endereço indicado pelo Vite — por exemplo, `http://192.168.0.26:5173/alcateia-games/`. Não exponha esse servidor a redes não confiáveis.

Para investigar um erro no celular:

- **Android/Chrome:** conecte o dispositivo por USB e abra `chrome://inspect/#devices` no Chrome do computador.
- **iPhone/iPad/Safari:** habilite o Web Inspector em Ajustes > Safari > Avançado e use Develop > [dispositivo] no Safari do macOS.

## Multiplayer e Supabase

Os jogos de letras, peso, número e Mega senha funcionam sem configuração externa. Para habilitar as salas online (Impostor, Tempo certo e Campo minado), crie um projeto gratuito no Supabase, copie `.env.example` para `.env.local`, preencha os valores e rode `npm run dev` (ou passe as variáveis na linha de comando):

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co \
VITE_SUPABASE_ANON_KEY=sua-chave-publica \
npm run dev
```

Sem essas variáveis, os jogos multiplayer exibem a tela "Salas online fora do ar" (503). Não coloque uma service role key no frontend. Nenhuma tabela é necessária: tudo usa canais efêmeros.

| Jogo | Canal | Eventos de Broadcast |
|---|---|---|
| Impostor | `impostor:<pin>` | `round-start`, `vote`, `end-round`, `room-closed` |
| Tempo certo | `time-game:<pin>` | `round-start`, `timer-start`, `round-score`, `game-finished`, `room-closed` |
| Campo minado | `campo-minado:<pin>` | `update_config`, `start_game`, `cell_click`, `forfeit`, `reset_game`, `room-closed` |

Presence mantém a lista de jogadores em cada canal. Como os eventos partem dos clientes, não há garantia de sigilo ou anti-trapaça (por exemplo, a palavra do Impostor é transmitida a todos os participantes).

**Tempo certo:** quem cria a sala define entre 1 e 20 rodadas (5 por padrão), o tempo máximo sorteável (5 a 120 segundos), a precisão do alvo (segundos ou centésimos, exibidos com duas casas) e o desfoque do cronômetro. Os tempos-alvo não se repetem durante a mesma partida. A rodada só avança após todos os participantes finalizarem suas tentativas. O criador pode encerrar a sala, desconectando os participantes.

**Impostor:** o criador pode sortear uma nova rodada com nova palavra e novo impostor, ou encerrar a sala para todos os participantes.

## Scripts

```bash
npm run lint   # typecheck (tsc -p tsconfig.app.json, falha em imports não usados)
npm test       # testes dos geradores, formatadores e catálogo de palavras
npm run build  # build PWA de produção
npm run preview # serve o build para testar PWA/offline
```

Os testes cobrem `src/lib/utils.ts`, as regras do Campo Minado (`src/lib/campo-minado-rules.ts`) e o catálogo da Mega senha; a lógica dos jogos e do Realtime é validada manualmente (use duas abas ou dispositivos para o multiplayer).

## Publicação no GitHub Pages

O workflow em `.github/workflows/deploy.yml` roda a cada push em `main` (ou manualmente), faz `npm ci`, `npm run lint`, `npm test` e `npm run build`, copia `dist/index.html` para `dist/404.html` (fallback das rotas da SPA) e publica `dist` no GitHub Pages. Em Settings > Pages, escolha **GitHub Actions** como fonte. O Vite está configurado para o caminho `/alcateia-games/`, que corresponde ao nome atual do repositório. Se o repositório for renomeado, ajuste `base` em `vite.config.ts`.

### Variáveis do Supabase no pipeline

O `.env` local nunca vai para o repositório (`.gitignore`; só `.env.example` é versionado) nem para o runner. No deploy, o workflow lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` de `${{ vars.* }}` e as repassa ao `npm run build`, que as embute no bundle. Cadastre-as em Settings > Secrets and variables > Actions > **Variables** (não em Secrets). Um passo anterior ao build falha com mensagem clara se alguma estiver vazia, para não publicar o site com o multiplayer desligado sem aviso.

A chave `sb_publishable_…` (ou anon) fica visível no JavaScript do site publicado, por desenho: ela é pública. Nunca use `service_role` nem `sb_secret_…` no frontend; se uma chave secreta vazar, gire-a no painel do Supabase.
