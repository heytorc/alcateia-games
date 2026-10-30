import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, LogIn, Play, Plus, RotateCcw, SkipForward, Trophy } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { celebrate, GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { playSuccessHorn, playTuningSound } from "@/lib/audio";
import { supabase } from "@/lib/realtime";
import { addVotes, finalStandings, leaders, tallyVotes, type Person, type Tally, type Votes } from "@/lib/provavel-rules";
import { createClientId, createRoomPin, drawUnique } from "@/lib/utils";
import { GameIcon } from "@/components/games/GameIcon";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useWords } from "@/hooks/useWords";
import { useGameStore } from "@/lib/store";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { isHostRoom, setHostRoom, useRestoreRoom } from "@/hooks/useRestoreRoom";
import { ErrorPage } from "@/components/ErrorPage";
import { useOnline } from "@/hooks/useOnline";
import { GameButton } from "@/components/games/GameButton";
import { LedSign } from "@/components/games/LedSign";
import { BottomSheet } from "@/components/BottomSheet";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";
import { provavelQuestions as bundledQuestions } from "@/constants/provavel-words";

type RoundStartPayload = { round: number; totalRounds: number; question: string; totals: Record<string, number> };
type VotePayload = { voterId: string; targetId: string };
type RevealPayload = { votes: Votes; totals: Record<string, number> };
type ProvavelPresence = Person & { roundStart?: RoundStartPayload };
type RoomConfig = { roundCount: number };

const roundCountSchema = z.coerce
  .number()
  .int()
  .min(1, "Informe entre 1 e 30 perguntas.")
  .max(30, "Informe entre 1 e 30 perguntas.");

const leaderText = (list: Tally[]) =>
  list.length === 0
    ? "Ninguém recebeu voto."
    : list.length === 1
      ? `${list[0].avatar} ${list[0].name}`
      : `Empate: ${list.map((entry) => `${entry.avatar} ${entry.name}`).join(" e ")}`;

function VoteBars({ tally, selfId }: { tally: Tally[]; selfId: string }) {
  const max = Math.max(1, ...tally.map((entry) => entry.votes));
  return (
    <ol aria-label="Votos" className="grid w-full gap-2">
      {tally.map((entry) => (
        <li
          key={entry.id}
          className="relative grid grid-cols-[42px_1fr_auto] items-center gap-3 overflow-hidden rounded-[6px] bg-[#1b1040] p-3.5 text-left">
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 bg-[#00cec9]/25 transition-[width] duration-700 motion-reduce:transition-none"
            style={{ width: `${(entry.votes / max) * 100}%` }}
          />
          <span className="relative font-heading text-xl font-bold text-[#bbb5d3]">{entry.rank}º</span>
          <strong className="relative truncate">
            {entry.avatar} {entry.name}
            {entry.id === selfId && <span className="ml-2 text-xs text-[#9b97b2]">(você)</span>}
          </strong>
          <small className="relative text-[#e6e2f3]">
            {entry.votes} {entry.votes === 1 ? "voto" : "votos"}
          </small>
        </li>
      ))}
    </ol>
  );
}

export function ProvavelGame() {
  const navigate = useNavigate();
  const questions = useWords("provavel", bundledQuestions);
  const [room, setRoom] = useState("");
  const [roundCount, setRoundCount] = useState(10);
  const [roundCountInput, setRoundCountInput] = useState("10");
  const [roundCountError, setRoundCountError] = useState<string>();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, Person>>({});
  /** Todos que já passaram pela sala: quem sai continua aparecendo nos votos que recebeu. */
  const [known, setKnown] = useState<Record<string, Person>>({});
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState("");
  const [votes, setVotes] = useState<Votes>({});
  const [revealed, setRevealed] = useState(false);
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const playerId = useRef(createClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeRoundRef = useRef(0);
  /** Após voltar ao lobby, a presença ainda pode trazer o `roundStart` antigo até o anfitrião reanunciar: ignora até a próxima rodada. */
  const ignorePresenceRound = useRef(false);
  const usedQuestions = useRef<string[]>([]);
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("provavel", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("provavel", restoredPin));
  });

  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const people = useMemo(() => ({ ...known, ...players }), [known, players]);
  const playerIds = Object.keys(players);
  const voters = playerIds.filter((id) => votes[id]);
  const allVoted = playerIds.length > 0 && voters.length === playerIds.length;
  const myVote = votes[playerId.current];
  const tally = useMemo(() => tallyVotes(votes, players), [votes, players]);
  const standings = useMemo(() => finalStandings(totals, people), [totals, people]);

  useEffect(() => {
    if (finished) celebrate();
  }, [finished]);

  const applyRoundStart = (payload: RoundStartPayload) => {
    activeRoundRef.current = payload.round;
    ignorePresenceRound.current = false;
    setRound(payload.round);
    setRoundCount(payload.totalRounds);
    setRoundCountInput(String(payload.totalRounds));
    setQuestion(payload.question);
    setTotals(payload.totals);
    setVotes({});
    setRevealed(false);
    setFinished(false);
  };

  const applyReveal = (payload: RevealPayload) => {
    setVotes(payload.votes);
    setTotals(payload.totals);
    setRevealed(true);
  };

  const applyLobbyReset = () => {
    activeRoundRef.current = 0;
    ignorePresenceRound.current = true;
    usedQuestions.current = [];
    setRound(0);
    setQuestion("");
    setVotes({});
    setRevealed(false);
    setTotals({});
    setFinished(false);
    setLastRoom(room, "provavel");
  };

  const applyConfig = (config: RoomConfig) => {
    setRoundCount(config.roundCount);
    setRoundCountInput(String(config.roundCount));
    setRoundCountError(undefined);
  };
  const sharedRef = useRef({ isHost, config: { roundCount } });
  sharedRef.current = { isHost, config: { roundCount } };

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`provavel:${room}`, { config: { presence: { key: playerId.current } } });
    const syncLobby = () => {
      const presence = channel.presenceState<ProvavelPresence>();
      const current = Object.fromEntries(
        Object.entries(presence).map(([id, entries]) => [
          id,
          { name: entries[0]?.name ?? "Jogador", avatar: entries[0]?.avatar ?? "🐺" },
        ]),
      );
      setPlayers(current);
      setKnown((previous) => ({ ...previous, ...current }));
      if (activeRoundRef.current === 0 && !ignorePresenceRound.current) {
        const activeRound = Object.values(presence)
          .flat()
          .find((entry) => entry.roundStart)?.roundStart;
        if (activeRound) applyRoundStart(activeRound);
      }
    };
    channel
      .on("presence", { event: "sync" }, syncLobby)
      .on("presence", { event: "join" }, () => {
        syncLobby();
        if (sharedRef.current.isHost && activeRoundRef.current === 0) {
          void channel.send({ type: "broadcast", event: "update-config", payload: sharedRef.current.config });
        }
      })
      .on("presence", { event: "leave" }, syncLobby)
      .on("broadcast", { event: "update-config" }, ({ payload }: { payload: RoomConfig }) => applyConfig(payload))
      .on("broadcast", { event: "round-start" }, ({ payload }: { payload: RoundStartPayload }) =>
        applyRoundStart(payload),
      )
      .on("broadcast", { event: "vote" }, ({ payload }: { payload: VotePayload }) =>
        setVotes((current) => ({ ...current, [payload.voterId]: payload.targetId })),
      )
      .on("broadcast", { event: "reveal" }, ({ payload }: { payload: RevealPayload }) => applyReveal(payload))
      .on("broadcast", { event: "back-to-lobby" }, applyLobbyReset)
      .on("broadcast", { event: "game-finished" }, () => setFinished(true))
      .on("broadcast", { event: "room-closed" }, () => {
        activeRoundRef.current = 0;
        setJoined(false);
        setRoomClosed(true);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
        setLastRoom(room, "provavel");
        syncLobby();
      });
    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room]);

  const reveal = async () => {
    if (revealed) return;
    const payload: RevealPayload = { votes, totals: addVotes(totals, votes) };
    applyReveal(payload);
    playTuningSound(soundEnabled);
    await channelRef.current?.send({ type: "broadcast", event: "reveal", payload });
  };

  // Todos votaram: o anfitrião revela sozinho (antes disso, só se tocar em "Revelar votos").
  useEffect(() => {
    if (isHost && round > 0 && !revealed && allVoted) void reveal();
    // `reveal` lê o estado atual deste render
  }, [isHost, round, revealed, allVoted]);

  const validateRoundCount = () => {
    const parsed = roundCountSchema.safeParse(roundCountInput);
    setRoundCountError(parsed.success ? undefined : parsed.error.issues[0]?.message);
    if (parsed.success) setRoundCount(parsed.data);
    return parsed.success ? parsed.data : null;
  };

  const joinListedRoom = (listedRoom: string) => {
    if (!profile.name.trim()) return;
    setRoom(listedRoom);
    setIsHost(false);
    setJoined(true);
  };

  const createRoom = () => {
    if (!profile.name.trim()) return;
    if (validateRoundCount() === null) return;
    setCreateDialogOpen(false);
    const newPin = createRoomPin();
    setRoom(newPin);
    setRoomClosed(false);
    setIsHost(true);
    setHostRoom("provavel", newPin, true);
    setJoined(true);
    setFinished(false);
    navigate(`?pin=${newPin}`);
  };

  const openSettings = () => {
    settingsSnapshot.current = sharedRef.current.config;
    setSettingsOpen(true);
  };

  const closeSettings = () => {
    if (settingsSnapshot.current) applyConfig(settingsSnapshot.current);
    setSettingsOpen(false);
  };

  const saveSettings = async () => {
    const count = validateRoundCount();
    if (count === null) return;
    const next: RoomConfig = { roundCount: count };
    applyConfig(next);
    setSettingsOpen(false);
    await channelRef.current?.send({ type: "broadcast", event: "update-config", payload: next });
  };

  const joinRoom = () => {
    if (!profile.name.trim() || !room.trim()) return;
    setRoomClosed(false);
    setIsHost(false);
    setJoined(true);
    setFinished(false);
    navigate(`?pin=${room}`);
  };

  const startRound = async (nextRound = 1) => {
    const channel = channelRef.current;
    if (!channel) return;
    if (nextRound === 1) usedQuestions.current = [];
    // Sem repetir na partida; se o catálogo acabar, `drawUnique` volta a sortear entre todas.
    const nextQuestion = drawUnique(questions, usedQuestions.current, false);
    usedQuestions.current = [...usedQuestions.current, nextQuestion];
    const payload: RoundStartPayload = {
      round: nextRound,
      totalRounds: roundCount,
      question: nextQuestion,
      totals: nextRound === 1 ? {} : totals,
    };
    applyRoundStart(payload);
    await channel.track({ name: profile.name.trim(), avatar: profile.avatar, roundStart: payload });
    await channel.send({ type: "broadcast", event: "round-start", payload });
  };

  const vote = async (targetId: string) => {
    if (revealed) return;
    const payload: VotePayload = { voterId: playerId.current, targetId };
    setVotes((current) => ({ ...current, [payload.voterId]: targetId }));
    if ("vibrate" in navigator) navigator.vibrate(40);
    await channelRef.current?.send({ type: "broadcast", event: "vote", payload });
  };

  const backToLobby = async () => {
    applyLobbyReset();
    const channel = channelRef.current;
    // Sem `roundStart` na presença: quem entrar agora cai no lobby, não na rodada antiga.
    await channel?.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
    await channel?.send({ type: "broadcast", event: "back-to-lobby", payload: {} });
  };

  const finishGame = async () => {
    setFinished(true);
    setLastRoom(null, null);
    playSuccessHorn(soundEnabled);
    await channelRef.current?.send({ type: "broadcast", event: "game-finished", payload: {} });
  };

  const resetRoomState = () => {
    activeRoundRef.current = 0;
    usedQuestions.current = [];
    setJoined(false);
    setLastRoom(null, null);
    setFinished(false);
    setRound(0);
    setQuestion("");
    setVotes({});
    setRevealed(false);
    setTotals({});
    navigate({ search: "" }, { replace: true });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    setHostRoom("provavel", room, false);
    resetRoomState();
  };

  const leaveRoom = async () => {
    const channel = channelRef.current;
    if (channel && supabase) await supabase.removeChannel(channel);
    resetRoomState();
  };

  const leaveConfig = { host: isHost, onConfirm: isHost ? closeRoom : leaveRoom };

  const configForm = (
    <div className="mb-4 flex flex-col gap-y-3">
      <div className="my-3 w-full">
        <Label className="justify-between text-base font-bold text-[#c2b9d1]">
          Perguntas{" "}
          <NumberStepper
            ariaLabel="Total de perguntas"
            min={1}
            max={30}
            value={roundCountInput}
            onChange={setRoundCountInput}
            onBlur={validateRoundCount}
            ariaInvalid={Boolean(roundCountError)}
            ariaDescribedBy="round-count-error"
          />
        </Label>
        {roundCountError && (
          <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="round-count-error">
            {roundCountError}
          </small>
        )}
      </div>
    </div>
  );

  if (!online && !joined) return <ErrorPage kind="offline" />;
  if (!supabase) return <ErrorPage kind="multiplayer" />;
  if (roomClosed)
    return (
      <ErrorPage
        kind="sala"
        pin={room}
        actions={[
          { label: "Encontrar outra sala", variant: "game", onClick: () => setRoomClosed(false) },
          { label: "Sair", variant: "special", to: "/" },
        ]}>
        O anfitrião encerrou a sala e todos os participantes foram desconectados.
      </ErrorPage>
    );
  if (!joined)
    return (
      <Shell>
        <main className="w-full px-5 md:px-10">
          <GameHeader
            title="Quem seria mais provável?"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="provavel"
                  isHosting={false}
                  hostName=""
                  hostAvatar=""
                  pin=""
                  disabled={!profile.name.trim()}
                  onJoin={joinListedRoom}
                />
              )
            }
          />
          <section className="grid w-full items-start gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-16">
            <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
              <GameIcon id="provavel" size={57} />
              <h2 className={roomHeadingClass}>Quem da alcateia?</h2>
              <p className={roomDescriptionClass}>
                Aparece uma pergunta e cada um vota em quem da sala tem mais a ver com ela, inclusive em si mesmo.
                Ninguém vê em quem os outros votaram; no fim, o placar mostra quem foi o mais votado.
              </p>
              {!profile.name && (
                <p className="text-sm text-[#ffd0d0]">
                  Defina seu nome pelo perfil na barra superior antes de entrar em uma sala.
                </p>
              )}
              <GameActions className="md:mx-0 md:justify-start">
                <GameButton variant="game" onClick={() => setCreateDialogOpen(true)}>
                  <Plus /> Criar sala
                </GameButton>
                <GameButton variant="info" onClick={() => setJoinDialogOpen(true)}>
                  <LogIn /> Entrar na sala
                </GameButton>
              </GameActions>
            </div>
            {isDesktop && (
              <RoomDirectory
                game="provavel"
                isHosting={false}
                hostName=""
                hostAvatar=""
                pin=""
                disabled={!profile.name.trim()}
                onJoin={joinListedRoom}
              />
            )}
          </section>
          <BottomSheet
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            title="Criar sala"
            description="Defina as regras da partida antes de chamar a alcateia."
            footer={
              <GameDialogFooter>
                <GameButton variant="special" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </GameButton>
                <GameButton variant="game" onClick={createRoom}>
                  Criar sala
                </GameButton>
              </GameDialogFooter>
            }>
            {configForm}
          </BottomSheet>
          <JoinRoomDialog
            open={joinDialogOpen}
            onOpenChange={setJoinDialogOpen}
            pin={room}
            onPinChange={setRoom}
            onConfirm={joinRoom}
          />
        </main>
      </Shell>
    );

  if (finished)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Quem seria mais provável?" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <section className="mx-auto my-[35px] flex w-full max-w-[600px] flex-col items-center gap-6 text-center">
            <Trophy className="text-[#fdcb6e]" size={48} />
            <Badge variant="outline">RESULTADO FINAL</Badge>
            <h2 className="font-heading text-[30px] font-bold">Mais votado da noite</h2>
            <p className="font-game-pixel text-lg text-[#fdcb6e]">{leaderText(leaders(standings))}</p>
            <VoteBars tally={standings} selfId={playerId.current} />
            {isHost && (
              <GameActions>
                <GameButton variant="game" onClick={backToLobby}>
                  <RotateCcw /> Jogar novamente
                </GameButton>
              </GameActions>
            )}
          </section>
        </main>
      </Shell>
    );

  if (round === 0)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader
            title="Quem seria mais provável?"
            room={{ pin: room, players: roster }}
            onSettings={isHost ? openSettings : undefined}
            leave={leaveConfig}
          />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <dl aria-label="Configurações da sala" className="grid w-full max-w-[260px] grid-cols-1 gap-2">
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Perguntas</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{roundCount}</dd>
              </div>
            </dl>
            {isHost ? (
              <GameActions>
                <GameButton variant="game" disabled={playerIds.length < 2} onClick={() => startRound(1)}>
                  <Play /> Iniciar
                </GameButton>
              </GameActions>
            ) : (
              <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar o jogo.</p>
            )}
            {isHost && playerIds.length < 2 && (
              <small className="text-xs text-[#bcb5cf]">É preciso pelo menos 2 jogadores na sala.</small>
            )}
            <RoomDirectory
              game="provavel"
              isHosting={isHost}
              showList={false}
              hostName={profile.name}
              hostAvatar={profile.avatar}
              pin={room}
              rounds={roundCount}
              onJoin={() => undefined}
            />
          </div>
          <BottomSheet
            open={settingsOpen}
            onOpenChange={(open) => !open && closeSettings()}
            title="Configurações da sala"
            description="As mudanças valem para todos os jogadores da sala."
            footer={
              <GameDialogFooter>
                <GameButton variant="special" onClick={closeSettings}>
                  Cancelar
                </GameButton>
                <GameButton variant="game" onClick={saveSettings}>
                  Salvar alterações
                </GameButton>
              </GameDialogFooter>
            }>
            {configForm}
          </BottomSheet>
        </main>
      </Shell>
    );

  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Quem seria mais provável?" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[600px] flex-col items-center gap-8">
          <LedSign className="w-full max-w-[220px] text-center">
            {round}/{roundCount}
          </LedSign>
          <article
            aria-live="polite"
            className="neon-box flex w-full flex-col gap-3 rounded-md border border-[#4a34a8] bg-[#150d33] p-6 text-center [--neon-c:#00cec9]">
            <p className="text-xs tracking-[.12em] text-[#9b97b2] uppercase">Quem é mais provável de…</p>
            <h2 className="font-game-pixel text-[clamp(18px,5vw,28px)] leading-snug text-white">{question}?</h2>
          </article>

          {revealed ? (
            <div className="flex w-full flex-col items-center gap-4 text-center">
              <p className="text-sm text-[#c9c4dd]">Mais votado</p>
              <p className="font-game-pixel text-lg text-[#fdcb6e]">{leaderText(leaders(tally))}</p>
              <VoteBars tally={tally} selfId={playerId.current} />
            </div>
          ) : (
            <div className="flex w-full flex-col gap-3">
              <h3 className="text-center text-base font-bold text-[#c2b9d1]">
                {myVote ? "Voto registrado. Dá para trocar até a revelação." : "Toque em quem você escolhe"}
              </h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {Object.entries(players).map(([id, player]) => (
                  <GameButton
                    key={id}
                    size="sm"
                    variant={myVote === id ? "game" : "special"}
                    aria-pressed={myVote === id}
                    className="min-w-0 truncate"
                    onClick={() => vote(id)}>
                    {player.avatar} {player.name}
                  </GameButton>
                ))}
              </div>
              <ul aria-label="Quem já votou" className="flex flex-wrap justify-center gap-2">
                {Object.entries(players).map(([id, player]) => (
                  <li
                    key={id}
                    className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${votes[id] ? "border-[#2ecc71] text-[#7dffb0]" : "border-[#4a34a8] text-[#9b97b2]"}`}>
                    {votes[id] && <Check size={12} />}
                    {player.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isHost && (
            <GameActions>
              {!revealed ? (
                <GameButton variant="info" disabled={voters.length === 0} onClick={reveal}>
                  <Eye /> Revelar votos ({voters.length}/{playerIds.length})
                </GameButton>
              ) : round < roundCount ? (
                <GameButton onClick={() => startRound(round + 1)}>
                  <SkipForward /> Próxima pergunta
                </GameButton>
              ) : (
                <GameButton variant="warning" onClick={finishGame}>
                  <Trophy /> Ver resultado
                </GameButton>
              )}
            </GameActions>
          )}
          {!isHost && revealed && <p className={roomDescriptionClass}>Aguarde o anfitrião seguir.</p>}
        </section>
      </main>
    </Shell>
  );
}
