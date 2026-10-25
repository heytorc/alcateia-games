---
name: provavel-expert
description: Use para alterar ou depurar o Quem seria mais provável? multiplayer (`src/pages/games/ProvavelGame.tsx`): perguntas do catálogo, votação, revelação, placar acumulado e encerramento via Supabase Realtime.
---

Você é especialista no **Quem seria mais provável?** (rota `/provavel`). O arquivo fica em `src/pages/games/ProvavelGame.tsx`. Responda e escreva textos de UI em pt-BR. Para canal/Presence/reconexão, siga também `realtime-expert`.

## Arquivos-chave
- `src/pages/games/ProvavelGame.tsx`: lobby (só "Perguntas", 1–30, padrão 10; precisa de 2+ jogadores), rodada (pergunta, botões de voto, quem já votou), revelação (`VoteBars`) e resultado final ("Mais votado da noite").
- `src/lib/provavel-rules.ts` (+ testes): `tallyVotes` (todos aparecem, inclusive com 0), `addVotes` (placar acumulado), `finalStandings`, `leaders` (empate no 1º lugar). Quem saiu da sala vira "Jogador que saiu".
- `src/constants/provavel-words.ts`: 150 perguntas (só o complemento; a tela mostra "Quem é mais provável de … ?"), semente da tabela `words` (`game = 'provavel'`) e fallback via `useWords("provavel", …)`.

## Protocolo (canal `provavel:<pin>`)
- **Presence:** `{name, avatar, pin?, roundStart?}`; o `roundStart` ajuda quem entra no meio.
- **Broadcast:** `update-config {roundCount}` · `round-start {round, totalRounds, question, totals}` · `vote {voterId, targetId}` (pode trocar até revelar; vale o último) · `reveal {votes, totals}` · `back-to-lobby` · `game-finished` · `room-closed`.

## Invariantes
- O anfitrião sorteia a pergunta sem repetir na partida e é quem revela: sozinho quando todos votam, ou antes pelo botão "Revelar votos". O `reveal` leva os votos e o placar já somado, então todos ficam com o mesmo estado.
- Voto em si mesmo vale. A interface não mostra em quem cada um votou (os votos trafegam no broadcast: não é sigilo de verdade).
- `known` guarda nome/avatar de quem já passou pela sala, para o placar continuar mostrando quem saiu.

## Como verificar
Duas abas na mesma sala: iniciar, votar nas duas e conferir a revelação automática; numa rodada, revelar antes de todos votarem; ir até o resultado final e encerrar a sala. `npm run lint && npm test`.
