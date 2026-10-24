import { useEffect, useMemo, useRef, useState } from "react";
import { GameIcon } from "@/components/games/GameIcon";
import { Play, RotateCcw, SkipForward, Trophy, Plus, LogIn } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { celebrate, GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell, Switch } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { playStopwatchStartSound, playStopwatchStopSound, playSuccessHorn } from "@/lib/audio";
import { supabase } from "@/lib/realtime";
import { createClientId, drawUniqueInteger, formatStopwatch, createRoomPin } from "@/lib/utils";
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
import { DigitalTimer } from "@/components/games/DigitalTimer";
import { BottomSheet } from "@/components/BottomSheet";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";

type Score = { id: string; name: string; avatar: string; excessMs: number };
type RoundStartPayload = {
  round: number;
  totalRounds: number;
  targetMilliseconds: number;
  targetPrecision: TargetPrecision;
  maxTargetSeconds: number;
  hideTargetOnStart: boolean;
  scores: Score[];
};
type PodiumPayload = { round: number; scores: Score[] };
type PodiumState = PodiumPayload & { previous: string[] | null };
type TimeGamePresence = { name: string; avatar: string; roundStart?: RoundStartPayload };
type RoomConfig = {
  roundCount: number;
  maxTargetSeconds: number;
  targetPrecision: TargetPrecision;
  hideTargetOnStart: boolean;
};
type RoomConfigField = "roundCount" | "maxTargetSeconds";
type TargetPrecision = "seconds" | "milliseconds";

const roomConfigSchema = z.object({
  roundCount: z.coerce.number().int().min(1, "Informe entre 1 e 20 rodadas.").max(20, "Informe entre 1 e 20 rodadas."),
  maxTargetSeconds: z.coerce
    .number()
    .int()
    .min(5, "Informe entre 5 e 120 segundos.")
    .max(120, "Informe entre 5 e 120 segundos."),
});

function targetOptionCount(maxTargetSeconds: number, precision: TargetPrecision) {
  return precision === "seconds" ? maxTargetSeconds - 4 : (maxTargetSeconds - 5) * 100 + 1;
}

function RoomSettingsSummary({ roundCount, maxTargetSeconds, targetPrecision, hideTargetOnStart }: RoomConfig) {
  const items = [
    ["Rodadas", String(roundCount)],
    ["Tempo máximo", `${maxTargetSeconds}s`],
    ["Precisão", targetPrecision === "seconds" ? "Segundos" : "Centésimos"],
    ["Ver tempo", hideTargetOnStart ? "Não" : "Sim"],
  ];
  return (
    <dl aria-label="Configurações da sala" className="grid w-full max-w-[520px] grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
          <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">{label}</dt>
          <dd className="mt-1 font-game-pixel text-sm text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function TimeGame() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [roundCount, setRoundCount] = useState(5);
  const [maxTargetSeconds, setMaxTargetSeconds] = useState(10);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roundCountInput, setRoundCountInput] = useState("5");
  const [maxTargetSecondsInput, setMaxTargetSecondsInput] = useState("10");
  const [configErrors, setConfigErrors] = useState<Partial<Record<RoomConfigField, string>>>({});
  const [hideTargetOnStart, setHideTargetOnStart] = useState(false);
  const [targetPrecision, setTargetPrecision] = useState<TargetPrecision>("seconds");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, { name: string; avatar: string }>>({});
  const [round, setRound] = useState(0);
  const [targetMilliseconds, setTargetMilliseconds] = useState<number | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [submitted, setSubmitted] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundResult, setRoundResult] = useState<number | null>(null);
  const [exactHit, setExactHit] = useState(false);
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
  const startedAt = useRef(0);
  const activeRoundRef = useRef(0);
  /** Após voltar ao lobby, a presença ainda pode trazer o `roundStart` antigo até o anfitrião reanunciar: ignora até a próxima rodada. */
  const ignorePresenceRound = useRef(false);
  const usedTargetValues = useRef<number[]>([]);
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("time", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("time", restoredPin));
  });

  const leaderboard = useMemo(() => [...scores].sort((left, right) => left.excessMs - right.excessMs), [scores]);
  const playerIds = Object.keys(players);
  const allSubmitted = playerIds.length > 0 && playerIds.every((id) => submitted.includes(id));

  const validateConfigField = (field: RoomConfigField) => {
    const result = roomConfigSchema.shape[field].safeParse(
      field === "roundCount" ? roundCountInput : maxTargetSecondsInput,
    );
    setConfigErrors((current) => ({
      ...current,
      [field]: result.success ? undefined : result.error.issues[0]?.message,
    }));
    if (!result.success) return;
    if (field === "roundCount") setRoundCount(result.data);
    else setMaxTargetSeconds(result.data);
  };

  const validateRoomConfig = () => {
    const result = roomConfigSchema.safeParse({ roundCount: roundCountInput, maxTargetSeconds: maxTargetSecondsInput });
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      setConfigErrors({
        roundCount: errors.roundCount?.[0],
        maxTargetSeconds: errors.maxTargetSeconds?.[0],
      });
      return null;
    }
    setConfigErrors({});
    if (targetOptionCount(result.data.maxTargetSeconds, targetPrecision) < result.data.roundCount) {
      setConfigErrors({ roundCount: "Aumente o tempo máximo ou reduza o total de rodadas para não repetir alvos." });
      return null;
    }
    return result.data;
  };

  const applyRoundStart = (payload: RoundStartPayload) => {
    activeRoundRef.current = payload.round;
    ignorePresenceRound.current = false;
    if (payload.round === 1) lastPodiumOrder.current = null;
    setPodium(null);
    setRound(payload.round);
    setRoundCount(payload.totalRounds);
    setMaxTargetSeconds(payload.maxTargetSeconds);
    setRoundCountInput(String(payload.totalRounds));
    setMaxTargetSecondsInput(String(payload.maxTargetSeconds));
    setHideTargetOnStart(payload.hideTargetOnStart);
    setTargetMilliseconds(payload.targetMilliseconds);
    setTargetPrecision(payload.targetPrecision);
    setScores(payload.scores);
    setSubmitted([]);
    setElapsedMs(0);
    setRoundResult(null);
    setExactHit(false);
    setRunning(false);
    setFinished(false);
  };

  const applyLobbyReset = () => {
    activeRoundRef.current = 0;
    ignorePresenceRound.current = true;
    usedTargetValues.current = [];
    lastPodiumOrder.current = null;
    setPodium(null);
    setFinished(false);
    setRunning(false);
    setRound(0);
    setTargetMilliseconds(null);
    setScores([]);
    setSubmitted([]);
    setRoundResult(null);
    setExactHit(false);
    setElapsedMs(0);
    setLastRoom(room, "time");
  };

  const applyPodium = (payload: PodiumPayload) => {
    setPodium({ ...payload, previous: lastPodiumOrder.current });
    lastPodiumOrder.current = podiumOrder(payload.scores);
  };

  const applyConfig = (config: RoomConfig) => {
    setRoundCount(config.roundCount);
    setMaxTargetSeconds(config.maxTargetSeconds);
    setRoundCountInput(String(config.roundCount));
    setMaxTargetSecondsInput(String(config.maxTargetSeconds));
    setTargetPrecision(config.targetPrecision);
    setHideTargetOnStart(config.hideTargetOnStart);
    setConfigErrors({});
  };
  const sharedRef = useRef({ isHost, config: { roundCount, maxTargetSeconds, targetPrecision, hideTargetOnStart } });
  sharedRef.current = { isHost, config: { roundCount, maxTargetSeconds, targetPrecision, hideTargetOnStart } };

  useEffect(() => {
    if (!running) return;
    let frame = 0;
    const updateElapsed = () => {
      setElapsedMs(performance.now() - startedAt.current);
      frame = requestAnimationFrame(updateElapsed);
    };
    frame = requestAnimationFrame(updateElapsed);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  useEffect(() => {
    if (finished) celebrate();
  }, [finished]);

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`time-game:${room}`, { config: { presence: { key: playerId.current } } });
    const syncLobby = () => {
      const presence = channel.presenceState<TimeGamePresence>();
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
      .on("broadcast", { event: "round-score" }, ({ payload }: { payload: Score }) => {
        setSubmitted((current) => (current.includes(payload.id) ? current : [...current, payload.id]));
        setScores((current) => {
          const previous = current.find((score) => score.id === payload.id);
          return [
            ...current.filter((score) => score.id !== payload.id),
            { ...payload, excessMs: (previous?.excessMs ?? 0) + payload.excessMs },
          ];
        });
      })
      .on("broadcast", { event: "game-finished" }, () => {
        setRunning(false);
        setFinished(true);
      })
      .on("broadcast", { event: "room-closed" }, () => {
        setRunning(false);
        activeRoundRef.current = 0;
        setJoined(false);
        setRoomClosed(true);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
        setLastRoom(room, "time");
        syncLobby();
      });
    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room]);

  const joinListedRoom = (listedRoom: string) => {
    if (!profile.name.trim()) return;
    setRoom(listedRoom);
    setIsHost(false);
    setJoined(true);
  };

  const createRoom = () => {
    if (!profile.name.trim()) return;
    const config = validateRoomConfig();
    if (!config) return;
    setCreateDialogOpen(false);
    setRoundCount(config.roundCount);
    setMaxTargetSeconds(config.maxTargetSeconds);
    const newPin = createRoomPin();
    setRoom(newPin);
    setRoomClosed(false);
    setIsHost(true);
    setHostRoom("time", newPin, true);
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
    const config = validateRoomConfig();
    if (!config) return;
    const next: RoomConfig = { ...config, targetPrecision, hideTargetOnStart };
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
    if (nextRound === 1) usedTargetValues.current = [];
    const interval = targetPrecision === "seconds" ? 1_000 : 10;
    const firstTarget = 5_000;
    const targetIndex = drawUniqueInteger(
      0,
      targetOptionCount(maxTargetSeconds, targetPrecision) - 1,
      usedTargetValues.current.map((target) => (target - firstTarget) / interval),
    );
    if (targetIndex === null) return;
    const targetMilliseconds = firstTarget + targetIndex * interval;
    usedTargetValues.current = [...usedTargetValues.current, targetMilliseconds];
    const payload: RoundStartPayload = {
      round: nextRound,
      totalRounds: roundCount,
      targetMilliseconds,
      targetPrecision,
      maxTargetSeconds,
      hideTargetOnStart,
      scores: nextRound === 1 ? [] : scores,
    };
    applyRoundStart(payload);
    await channel.track({ name: profile.name.trim(), avatar: profile.avatar, roundStart: payload });
    await channel.send({ type: "broadcast", event: "round-start", payload });
  };

  const toggleTimer = async () => {
    if (targetMilliseconds === null || roundResult !== null) return;
    if (!running) {
      startedAt.current = performance.now() - elapsedMs;
      setRunning(true);
      playStopwatchStartSound(soundEnabled);
      if ("vibrate" in navigator) navigator.vibrate(150);
      return;
    }
    setRunning(false);
    playStopwatchStopSound(soundEnabled);
    if ("vibrate" in navigator) navigator.vibrate(150);
    const finalElapsed = performance.now() - startedAt.current;
    const excessMs = Math.abs(finalElapsed - targetMilliseconds);
    const isExact = Math.round(excessMs / 10) === 0;
    const score = { id: playerId.current, name: profile.name.trim(), avatar: profile.avatar, excessMs };
    setElapsedMs(finalElapsed);
    setRoundResult(excessMs);
    setExactHit(isExact);
    setSubmitted((current) => (current.includes(score.id) ? current : [...current, score.id]));
    setScores((current) => {
      const previous = current.find((item) => item.id === score.id);
      return [
        ...current.filter((item) => item.id !== score.id),
        { ...score, excessMs: (previous?.excessMs ?? 0) + excessMs },
      ];
    });
    if (isExact) {
      celebrate();
      playSuccessHorn(soundEnabled);
    }
    await channelRef.current?.send({ type: "broadcast", event: "round-score", payload: score });
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
    await channelRef.current?.send({ type: "broadcast", event: "game-finished", payload: {} });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    activeRoundRef.current = 0;
    usedTargetValues.current = [];
    setHostRoom("time", room, false);
    setJoined(false);
    navigate({ search: "" }, { replace: true });
    setLastRoom(null, null);
    setFinished(false);
    setRunning(false);
    setRound(0);
    setTargetMilliseconds(null);
    setScores([]);
    setSubmitted([]);
    setRoundResult(null);
    setExactHit(false);
    setElapsedMs(0);
  };

  const leaveRoom = async () => {
    const channel = channelRef.current;
    if (channel && supabase) await supabase.removeChannel(channel);
    activeRoundRef.current = 0;
    usedTargetValues.current = [];
    setJoined(false);
    setLastRoom(null, null);
    setFinished(false);
    setRunning(false);
    setRound(0);
    setTargetMilliseconds(null);
    setScores([]);
    setSubmitted([]);
    setRoundResult(null);
    setExactHit(false);
    setElapsedMs(0);
    navigate({ search: "" }, { replace: true });
  };

  const leaveConfig = { host: isHost, onConfirm: isHost ? closeRoom : leaveRoom };

  const setupPageClass = "w-full px-5 md:px-10";

  const configForm = (
    <div className="flex flex-col gap-y-3 mb-4">
      <div className="my-3 w-full">
        <Label className="justify-between text-base font-bold text-[#c2b9d1]">
          Rodadas{" "}
          <NumberStepper
            ariaLabel="Total de rodadas"
            min={1}
            max={20}
            value={roundCountInput}
            onChange={setRoundCountInput}
            onBlur={() => validateConfigField("roundCount")}
            ariaInvalid={Boolean(configErrors.roundCount)}
            ariaDescribedBy="round-count-error"
          />
        </Label>
        {configErrors.roundCount && (
          <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="round-count-error">
            {configErrors.roundCount}
          </small>
        )}
      </div>
      <div className="my-3 w-full">
        <Label className="justify-between text-base font-bold text-[#c2b9d1]">
          Tempo máximo{" "}
          <NumberStepper
            ariaLabel="Tempo máximo em segundos"
            min={5}
            max={120}
            value={maxTargetSecondsInput}
            onChange={setMaxTargetSecondsInput}
            onBlur={() => validateConfigField("maxTargetSeconds")}
            ariaInvalid={Boolean(configErrors.maxTargetSeconds)}
            ariaDescribedBy="max-target-seconds-error"
          />
        </Label>
        {configErrors.maxTargetSeconds && (
          <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="max-target-seconds-error">
            {configErrors.maxTargetSeconds}
          </small>
        )}
      </div>
      <div className="my-3 flex w-full flex-wrap items-center justify-between gap-2 text-base font-bold text-[#c2b9d1]">
        <span>Precisão do tempo alvo</span>
        <div className="flex w-full overflow-hidden rounded-md">
          <GameButton
            size="sm"
            className="min-w-0 flex-1 whitespace-normal rounded-none p-8"
            variant={targetPrecision === "seconds" ? "game" : "special"}
            type="button"
            onClick={() => setTargetPrecision("seconds")}>
            Segundos
          </GameButton>
          <GameButton
            size="sm"
            className="min-w-0 flex-1 whitespace-normal rounded-none p-8"
            variant={targetPrecision === "milliseconds" ? "game" : "special"}
            type="button"
            onClick={() => setTargetPrecision("milliseconds")}>
            Segundos e centésimos
          </GameButton>
        </div>
      </div>
      <div className="my-[5px] mb-3.5 flex w-full items-center justify-between text-base font-bold text-[#c2b9d1]">
        <span>Ver tempo</span>
        <Switch checked={!hideTargetOnStart} onChange={(visible) => setHideTargetOnStart(!visible)} />
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
        <main className={setupPageClass}>
          <GameHeader
            title="Tempo certo"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="time"
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
              <GameIcon id="time" size={57} />
              <h2 className={roomHeadingClass}>Chegue no tempo certo</h2>
              <p className={roomDescriptionClass}>
                Inicie o cronômetro no clique e pare o mais próximo possível do tempo sorteado.
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
                game="time"
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
          <GameHeader title="Tempo certo" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <Card className="mx-auto my-[35px] flex w-full max-w-[670px] items-center rounded-[6px] p-9 text-center sm:p-9">
            <CardContent className="flex w-full flex-col items-center gap-5">
              <Trophy className="mb-3 text-[#fdcb6e]" size={48} />
              <Badge variant="outline">RESULTADO FINAL</Badge>
              <h2 className="mt-2.5 mb-[25px] font-heading text-[34px] font-bold">Pódio da alcateia</h2>
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
                          <Badge className="h-5 px-1.5 text-[10px] font-bold uppercase bg-[#4b3c16] text-white rounded-md">
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

  if (targetMilliseconds === null)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader
            title="Tempo certo"
            room={{ pin: room, players: roster }}
            onSettings={isHost ? openSettings : undefined}
            leave={leaveConfig}
          />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <RoomSettingsSummary
              roundCount={roundCount}
              maxTargetSeconds={maxTargetSeconds}
              targetPrecision={targetPrecision}
              hideTargetOnStart={hideTargetOnStart}
            />
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
              game="time"
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
        <main className={`${roomPageClass}`}>
          <GameHeader title="Tempo certo" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <section className="mx-auto my-[25px] flex w-full max-w-[560px] flex-col items-center gap-10">
            <div className="text-center">
              <Badge variant="outline" className="mb-3">
                RODADA {podium.round}/{roundCount}
              </Badge>
              <h2 className="font-heading text-[28px] font-bold">Pódio parcial</h2>
            </div>
            <PartialPodium players={podium.scores} previousOrder={podium.previous} selfId={playerId.current} />
            {isHost && (
              <GameActions>
                <GameButton variant="game" onClick={() => startRound(round + 1)}>
                  <SkipForward /> Continuar
                </GameButton>
              </GameActions>
            )}
            {!isHost && <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar a próxima rodada.</p>}
          </section>
        </main>
      </Shell>
    );

  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Tempo certo" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[700px] flex-col items-center gap-15">
          <div className="flex w-full flex-row items-end justify-between gap-4 sm:gap-8">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 text-center">
              <span className="text-base text-[#c9c4dd]">Rodada</span>
              <LedSign className="w-full text-center">
                {round}/{roundCount}
              </LedSign>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 rounded-md text-center">
              <span className="text-base text-[#c9c4dd]">Tempo alvo</span>
              <div className="w-full max-w-[280px] rounded-sm bg-[#ffe14a] px-3 py-4 font-heading text-[clamp(16px,5.2vw,30px)] font-bold tracking-normal text-[#12040a] shadow-[6px_6px_0_#ff4552] sm:px-7 sm:tracking-wide">
                {formatStopwatch(targetMilliseconds)}
              </div>
            </div>
          </div>
          <DigitalTimer
            elapsedMs={elapsedMs}
            running={running}
            finished={roundResult !== null}
            exact={exactHit}
            hideReadout={hideTargetOnStart && running}
            onPress={toggleTimer}
          />
          <p className="sr-only" aria-live="polite">
            {roundResult !== null && `Seu cronômetro marcou ${formatStopwatch(elapsedMs)}.`}
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
                <small className="w-full text-center my-5 text-xs text-[#bcb5cf]">
                  Aguardando participantes: {submitted.length}/{playerIds.length} finalizaram.
                </small>
              )}
            </>
          )}
        </section>
      </main>
    </Shell>
  );
}
