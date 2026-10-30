import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { LogIn, Play, Plus, RotateCcw, SkipForward, Trophy } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { celebrate, GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { playStopwatchStopSound, playSuccessHorn, playTimerEndSound } from "@/lib/audio";
import { supabase } from "@/lib/realtime";
import { classifyTap, drawWaitMs, MAX_REACTION_MS, type TapResult } from "@/lib/reflexo-rules";
import { createClientId, createRoomPin, formatStopwatch } from "@/lib/utils";
import { GameIcon } from "@/components/games/GameIcon";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useGameStore } from "@/lib/store";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { isHostRoom, setHostRoom, useRestoreRoom } from "@/hooks/useRestoreRoom";
import { ErrorPage } from "@/components/ErrorPage";
import { useOnline } from "@/hooks/useOnline";
import { GameButton } from "@/components/games/GameButton";
import { LedSign } from "@/components/games/LedSign";
import { PartialPodium, podiumOrder } from "@/components/games/PartialPodium";
import { BottomSheet } from "@/components/BottomSheet";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";

/** `excessMs` = tempo de reação acumulado (mesmo formato do Tempo Certo, para reaproveitar o `PartialPodium`). */
type Score = { id: string; name: string; avatar: string; excessMs: number };
type RoundStartPayload = { round: number; totalRounds: number; waitMs: number; scores: Score[] };
type PodiumPayload = { round: number; scores: Score[] };
type PodiumState = PodiumPayload & { previous: string[] | null };
type ReflexoPresence = { name: string; avatar: string; roundStart?: RoundStartPayload };
type RoomConfig = { roundCount: number };
/** Cena do lobo: esperando o bife, bife no pote, comendo (acertou) ou triste (largou antes ou demorou). */
type Phase = "espera" | "bife" | "comendo" | "triste";

const SCENES: Phase[] = ["espera", "bife", "comendo", "triste"];
const sceneSrc = (phase: Phase) => `${import.meta.env.BASE_URL}reflexo/${phase}.gif`;
const roundCountSchema = z.coerce
  .number()
  .int()
  .min(1, "Informe entre 1 e 20 rodadas.")
  .max(20, "Informe entre 1 e 20 rodadas.");

const resultText = (result: TapResult) =>
  result.kind === "hit"
    ? `${Math.round(result.ms)} ms`
    : result.kind === "slow"
      ? "Muito lento!"
      : "Largou antes do bife!";

type StageProps = { phase: Phase; round: number; steakShown: boolean; onSteakVisible: () => void; onTap: () => void };

/**
 * As cenas ficam empilhadas (espera → bife → resultado): cada uma entra por cima da anterior, que continua
 * visível enquanto a nova carrega, então a troca nunca pisca em branco.
 */
function ReflexoStage({ phase, round, steakShown, onSteakVisible, onTap }: StageProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (!event.repeat) onTap();
  };
  const layers: Phase[] = [
    "espera",
    ...(phase === "bife" || steakShown ? (["bife"] as const) : []),
    ...(phase === "comendo" || phase === "triste" ? [phase] : []),
  ];
  return (
    <button
      type="button"
      aria-label="Toque quando o bife aparecer no pote"
      onPointerDown={(event) => {
        event.preventDefault();
        onTap();
      }}
      onKeyDown={onKeyDown}
      className="neon-box relative aspect-square w-full max-w-[380px] touch-manipulation select-none overflow-hidden rounded-md border border-[#4a34a8] bg-[#150d33] outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff]">
      {layers.map((layer) => (
        <img
          key={`${layer}-${round}`}
          // O bife toca uma vez só: a query nova em cada rodada faz o GIF recomeçar do primeiro quadro.
          src={layer === "bife" ? `${sceneSrc(layer)}?r=${round}` : sceneSrc(layer)}
          alt=""
          draggable={false}
          // A reação conta de quando o bife está carregado na tela, não de quando o timer disparou.
          onLoad={layer === "bife" ? onSteakVisible : undefined}
          className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]"
        />
      ))}
    </button>
  );
}

export function ReflexoGame() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [roundCount, setRoundCount] = useState(5);
  const [roundCountInput, setRoundCountInput] = useState("5");
  const [roundCountError, setRoundCountError] = useState<string>();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, { name: string; avatar: string }>>({});
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<Phase>("espera");
  const [steakShown, setSteakShown] = useState(false);
  const [result, setResult] = useState<TapResult | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [podium, setPodium] = useState<PodiumState | null>(null);
  const lastPodiumOrder = useRef<string[] | null>(null);
  const playerId = useRef(createClientId());
  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const activeRoundRef = useRef(0);
  /** Após voltar ao lobby, a presença ainda pode trazer o `roundStart` antigo até o anfitrião reanunciar: ignora até a próxima rodada. */
  const ignorePresenceRound = useRef(false);
  /** Instante (`performance.now()`) em que o bife apareceu neste aparelho; `null` enquanto o lobo espera. */
  const steakAt = useRef<number | null>(null);
  const resultRef = useRef<TapResult | null>(null);
  const timers = useRef<number[]>([]);
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("reflexo", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("reflexo", restoredPin));
  });

  const leaderboard = useMemo(() => [...scores].sort((left, right) => left.excessMs - right.excessMs), [scores]);
  const playerIds = Object.keys(players);
  const allSubmitted = playerIds.length > 0 && playerIds.every((id) => submitted.includes(id));

  const clearTimers = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => {
    // Pré-carrega as cenas para o bife não atrasar por download na hora do sinal.
    SCENES.forEach((phase) => {
      new Image().src = sceneSrc(phase);
    });
    return clearTimers;
  }, []);

  useEffect(() => {
    if (finished) celebrate();
  }, [finished]);

  const addScore = (score: Score) => {
    setSubmitted((current) => (current.includes(score.id) ? current : [...current, score.id]));
    setScores((current) => {
      const previous = current.find((item) => item.id === score.id);
      return [
        ...current.filter((item) => item.id !== score.id),
        { ...score, excessMs: (previous?.excessMs ?? 0) + score.excessMs },
      ];
    });
  };

  const finishTap = (tap: TapResult) => {
    if (resultRef.current) return;
    clearTimers();
    resultRef.current = tap;
    setResult(tap);
    setPhase(tap.kind === "hit" ? "comendo" : "triste");
    if (tap.kind === "hit") playStopwatchStopSound(soundEnabled);
    else playTimerEndSound(soundEnabled);
    if ("vibrate" in navigator) navigator.vibrate(tap.kind === "hit" ? 80 : [60, 40, 60]);
    const score = { id: playerId.current, name: profile.name.trim(), avatar: profile.avatar, excessMs: tap.ms };
    addScore(score);
    void channelRef.current?.send({ type: "broadcast", event: "round-score", payload: score });
  };

  const tap = () => {
    if (activeRoundRef.current === 0 || resultRef.current) return;
    finishTap(classifyTap(performance.now(), steakAt.current));
  };

  const applyRoundStart = (payload: RoundStartPayload) => {
    clearTimers();
    activeRoundRef.current = payload.round;
    ignorePresenceRound.current = false;
    if (payload.round === 1) lastPodiumOrder.current = null;
    steakAt.current = null;
    resultRef.current = null;
    setPodium(null);
    setRound(payload.round);
    setRoundCount(payload.totalRounds);
    setRoundCountInput(String(payload.totalRounds));
    setScores(payload.scores);
    setSubmitted([]);
    setResult(null);
    setPhase("espera");
    setFinished(false);
    setSteakShown(false);
    // Cada aparelho conta a espera a partir de quando recebeu a rodada e mede a reação no próprio relógio.
    timers.current = [window.setTimeout(() => setPhase("bife"), payload.waitMs)];
  };

  const steakVisible = () => {
    if (resultRef.current || steakAt.current !== null) return;
    steakAt.current = performance.now();
    setSteakShown(true);
    timers.current.push(
      window.setTimeout(() => finishTapRef.current(classifyTap(performance.now(), steakAt.current)), MAX_REACTION_MS + 50),
    );
  };

  const applyLobbyReset = () => {
    clearTimers();
    activeRoundRef.current = 0;
    ignorePresenceRound.current = true;
    lastPodiumOrder.current = null;
    steakAt.current = null;
    resultRef.current = null;
    setPodium(null);
    setFinished(false);
    setRound(0);
    setScores([]);
    setSubmitted([]);
    setResult(null);
    setPhase("espera");
    setSteakShown(false);
    setLastRoom(room, "reflexo");
  };

  const applyPodium = (payload: PodiumPayload) => {
    setPodium({ ...payload, previous: lastPodiumOrder.current });
    lastPodiumOrder.current = podiumOrder(payload.scores);
  };

  const applyConfig = (config: RoomConfig) => {
    setRoundCount(config.roundCount);
    setRoundCountInput(String(config.roundCount));
    setRoundCountError(undefined);
  };
  const sharedRef = useRef({ isHost, config: { roundCount } });
  sharedRef.current = { isHost, config: { roundCount } };
  // Os handlers do canal e os timers vêm de renders antigos; a ref aponta sempre para a versão atual (perfil, som).
  const finishTapRef = useRef(finishTap);
  finishTapRef.current = finishTap;

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`reflexo:${room}`, { config: { presence: { key: playerId.current } } });
    const syncLobby = () => {
      const presence = channel.presenceState<ReflexoPresence>();
      setPlayers(
        Object.fromEntries(
          Object.entries(presence).map(([id, entries]) => [
            id,
            { name: entries[0]?.name ?? "Jogador", avatar: entries[0]?.avatar ?? "🐺" },
          ]),
        ),
      );
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
      .on("broadcast", { event: "back-to-lobby" }, applyLobbyReset)
      .on("broadcast", { event: "podium-show" }, ({ payload }: { payload: PodiumPayload }) => applyPodium(payload))
      .on("broadcast", { event: "round-score" }, ({ payload }: { payload: Score }) => addScore(payload))
      .on("broadcast", { event: "game-finished" }, () => {
        clearTimers();
        setFinished(true);
      })
      .on("broadcast", { event: "room-closed" }, () => {
        clearTimers();
        activeRoundRef.current = 0;
        setJoined(false);
        setRoomClosed(true);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
        setLastRoom(room, "reflexo");
        syncLobby();
      });
    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room]);

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
    setHostRoom("reflexo", newPin, true);
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
    const payload: RoundStartPayload = {
      round: nextRound,
      totalRounds: roundCount,
      waitMs: drawWaitMs(),
      scores: nextRound === 1 ? [] : scores,
    };
    applyRoundStart(payload);
    await channel.track({ name: profile.name.trim(), avatar: profile.avatar, roundStart: payload });
    await channel.send({ type: "broadcast", event: "round-start", payload });
  };

  const backToLobby = async () => {
    applyLobbyReset();
    const channel = channelRef.current;
    // Sem `roundStart` na presença: quem entrar agora cai no lobby, não na rodada antiga.
    await channel?.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
    await channel?.send({ type: "broadcast", event: "back-to-lobby", payload: {} });
  };

  const showPartialPodium = async () => {
    const payload: PodiumPayload = { round, scores };
    applyPodium(payload);
    await channelRef.current?.send({ type: "broadcast", event: "podium-show", payload });
  };

  const finishGame = async () => {
    setFinished(true);
    setLastRoom(null, null);
    playSuccessHorn(soundEnabled);
    await channelRef.current?.send({ type: "broadcast", event: "game-finished", payload: {} });
  };

  const resetRoomState = () => {
    clearTimers();
    activeRoundRef.current = 0;
    steakAt.current = null;
    resultRef.current = null;
    setJoined(false);
    setLastRoom(null, null);
    setFinished(false);
    setRound(0);
    setScores([]);
    setSubmitted([]);
    setResult(null);
    setPhase("espera");
    setSteakShown(false);
    navigate({ search: "" }, { replace: true });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    setHostRoom("reflexo", room, false);
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
          Rodadas{" "}
          <NumberStepper
            ariaLabel="Total de rodadas"
            min={1}
            max={20}
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
            title="Reflexo"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="reflexo"
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
              <GameIcon id="reflexo" size={57} />
              <h2 className={roomHeadingClass}>Mais rápido que o lobo</h2>
              <p className={roomDescriptionClass}>
                O lobo encara o pote vazio. Quando o bife aparecer, toque na tela o mais rápido que puder. Tocar
                antes do bife conta como largada falsa.
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
                game="reflexo"
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
          <GameHeader title="Reflexo" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <Card className="mx-auto my-[35px] flex w-full max-w-[670px] items-center rounded-[6px] p-9 text-center sm:p-9">
            <CardContent className="flex w-full flex-col items-center gap-5">
              <Trophy className="mb-3 text-[#fdcb6e]" size={48} />
              <Badge variant="outline">RESULTADO FINAL</Badge>
              <h2 className="mt-2.5 mb-[25px] font-heading text-[34px] font-bold">Pódio da alcateia</h2>
              <p className={roomDescriptionClass}>Vence quem somou o menor tempo de reação.</p>
              <div className="mb-[25px] grid w-full gap-2">
                {leaderboard.map((score) => {
                  const scoreValue = Math.floor(score.excessMs / 10);
                  const rank = leaderboard.filter((s) => Math.floor(s.excessMs / 10) < scoreValue).length + 1;
                  const isWinner = rank === 1;
                  return (
                    <div
                      className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-[6px] bg-[#1b1040] p-3.5 text-left ${isWinner ? "bg-[#fdcb6e] text-[#29223e]" : ""}`}
                      key={score.id}>
                      <span
                        className={`font-heading text-xl font-bold ${isWinner ? "text-[#4b3c16]" : "text-[#bbb5d3]"}`}>
                        {rank}º
                      </span>
                      <div className="flex items-center gap-2">
                        <strong className="whitespace-nowrap">
                          {score.avatar} {score.name}
                        </strong>
                        {isWinner && (
                          <Badge className="h-5 rounded-md bg-[#4b3c16] px-1.5 text-[10px] font-bold text-white uppercase">
                            Vencedor
                          </Badge>
                        )}
                      </div>
                      <small className={isWinner ? "text-[#4b3c16]" : "text-[#b8b2c8]"}>
                        {formatStopwatch(score.excessMs)}
                      </small>
                    </div>
                  );
                })}
              </div>
              {isHost && (
                <GameActions>
                  <GameButton variant="game" onClick={backToLobby}>
                    <RotateCcw /> Jogar novamente
                  </GameButton>
                </GameActions>
              )}
            </CardContent>
          </Card>
        </main>
      </Shell>
    );

  if (round === 0)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader
            title="Reflexo"
            room={{ pin: room, players: roster }}
            onSettings={isHost ? openSettings : undefined}
            leave={leaveConfig}
          />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <dl aria-label="Configurações da sala" className="grid w-full max-w-[260px] grid-cols-1 gap-2">
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Rodadas</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{roundCount}</dd>
              </div>
            </dl>
            {isHost ? (
              <GameActions>
                <GameButton variant="game" onClick={() => startRound(1)}>
                  <Play /> Iniciar
                </GameButton>
              </GameActions>
            ) : (
              <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar o jogo.</p>
            )}
            <RoomDirectory
              game="reflexo"
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

  if (podium)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Reflexo" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <section className="mx-auto my-[25px] flex w-full max-w-[560px] flex-col items-center gap-10">
            <div className="text-center">
              <Badge variant="outline" className="mb-3">
                RODADA {podium.round}/{roundCount}
              </Badge>
              <h2 className="font-heading text-[28px] font-bold">Pódio parcial</h2>
            </div>
            <PartialPodium players={podium.scores} previousOrder={podium.previous} selfId={playerId.current} />
            {isHost ? (
              <GameActions>
                <GameButton variant="game" onClick={() => startRound(round + 1)}>
                  <SkipForward /> Continuar
                </GameButton>
              </GameActions>
            ) : (
              <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar a próxima rodada.</p>
            )}
          </section>
        </main>
      </Shell>
    );

  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Reflexo" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[700px] flex-col items-center gap-8">
          <div className="flex w-full max-w-[380px] items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <span className="text-base text-[#c9c4dd]">Rodada</span>
              <LedSign className="w-full text-center">
                {round}/{roundCount}
              </LedSign>
            </div>
          </div>
          <ReflexoStage
            phase={phase}
            round={round}
            steakShown={steakShown}
            onSteakVisible={steakVisible}
            onTap={tap}
          />
          <p
            aria-live="polite"
            className={`min-h-8 font-game-pixel text-xl ${result?.kind === "hit" ? "text-[#7dffb0]" : result ? "text-[#ff8fab]" : "text-[#c9c4dd]"}`}>
            {result ? resultText(result) : steakShown ? "Agora!" : "Espere o bife…"}
          </p>
          {isHost && (
            <>
              <GameActions>
                {round < roundCount ? (
                  <GameButton disabled={!allSubmitted} onClick={showPartialPodium}>
                    <SkipForward /> Próxima rodada
                  </GameButton>
                ) : (
                  <GameButton variant="warning" disabled={!allSubmitted} onClick={finishGame}>
                    <Trophy /> Ver pódio
                  </GameButton>
                )}
              </GameActions>
              {!allSubmitted && (
                <small className="my-5 w-full text-center text-xs text-[#bcb5cf]">
                  Aguardando participantes: {submitted.length}/{playerIds.length} tocaram.
                </small>
              )}
            </>
          )}
        </section>
      </main>
    </Shell>
  );
}
