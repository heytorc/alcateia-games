import { useEffect, useMemo, useRef, useState } from "react";
import { GameIcon } from "@/components/games/GameIcon";
import { Play, RotateCcw, SkipForward, Trophy, X, Plus, LogIn, LogOut } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { celebrate, GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell, Switch } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { playStopwatchStartSound, playStopwatchStopSound, playSuccessHorn } from "@/lib/audio";
import { supabase } from "@/lib/realtime";
import { createClientId, drawUniqueInteger, formatStopwatch, createRoomPin } from "@/lib/utils";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useGameStore } from "@/lib/store";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { useRestoreRoom } from "@/hooks/useRestoreRoom";
import { ErrorPage } from "@/components/ErrorPage";
import { useOnline } from "@/hooks/useOnline";
import { GameButton } from "@/components/games/GameButton";
import { LedSign } from "@/components/games/LedSign";
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
    ["Cronômetro embaçado", hideTargetOnStart ? "Sim" : "Não"],
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
  const [maxTargetSeconds, setMaxTargetSeconds] = useState(30);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [roundCountInput, setRoundCountInput] = useState("5");
  const [maxTargetSecondsInput, setMaxTargetSecondsInput] = useState("30");
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
  const [startedPlayers, setStartedPlayers] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [roundResult, setRoundResult] = useState<number | null>(null);
  const [exactHit, setExactHit] = useState(false);
  const [finished, setFinished] = useState(false);
  const playerId = useRef(createClientId());
  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const channelRef = useRef<RealtimeChannel | null>(null);
  const startedAt = useRef(0);
  const activeRoundRef = useRef(0);
  const usedTargetValues = useRef<number[]>([]);
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("time", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
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
    setStartedPlayers([]);
    setElapsedMs(0);
    setRoundResult(null);
    setExactHit(false);
    setRunning(false);
    setFinished(false);
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
      if (activeRoundRef.current === 0) {
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
      .on("broadcast", { event: "timer-start" }, ({ payload }: { payload: { id: string } }) => {
        setStartedPlayers((current) => (current.includes(payload.id) ? current : [...current, payload.id]));
      })
      .on("broadcast", { event: "round-score" }, ({ payload }: { payload: Score }) => {
        setSubmitted((current) => (current.includes(payload.id) ? current : [...current, payload.id]));
        setStartedPlayers((current) => (current.includes(payload.id) ? current : [...current, payload.id]));
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
      setStartedPlayers((current) => (current.includes(playerId.current) ? current : [...current, playerId.current]));
      await channelRef.current?.send({ type: "broadcast", event: "timer-start", payload: { id: playerId.current } });
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
    setJoined(false);
    setRoomClosed(true);
    setLastRoom(null, null);
    setFinished(false);
    setRunning(false);
    setRound(0);
    setTargetMilliseconds(null);
    setScores([]);
    setSubmitted([]);
    setStartedPlayers([]);
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
    setStartedPlayers([]);
    setRoundResult(null);
    setExactHit(false);
    setElapsedMs(0);
    navigate("/");
  };

  const setupPageClass = "w-full px-5 md:px-10";

  const configForm = (
            <div className="mb-4">
        <div className="my-3 w-full">
          <Label className="justify-between text-sm font-bold text-[#c2b9d1]">
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
          <Label className="justify-between text-sm font-bold text-[#c2b9d1]">
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
        <div className="my-3 flex w-full flex-wrap items-center justify-between gap-2 text-sm font-bold text-[#c2b9d1]">
          <span>Precisão do tempo alvo</span>
          <div className="flex w-full overflow-hidden rounded-md">
            <GameButton
              size="sm"
              className="min-w-0 flex-1 whitespace-normal rounded-none"
              variant={targetPrecision === "seconds" ? "game" : "special"}
              type="button"
              onClick={() => setTargetPrecision("seconds")}>
              Segundos
            </GameButton>
            <GameButton
              size="sm"
              className="min-w-0 flex-1 whitespace-normal rounded-none"
              variant={targetPrecision === "milliseconds" ? "game" : "special"}
              type="button"
              onClick={() => setTargetPrecision("milliseconds")}>
              Segundos e centésimos
            </GameButton>
          </div>
        </div>
        <div className="my-[5px] mb-3.5 flex w-full items-center justify-between text-sm font-bold text-[#c2b9d1]">
          <span>Embaçar cronômetro ao iniciar</span>
          <Switch checked={hideTargetOnStart} onChange={setHideTargetOnStart} />
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
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogContent className="max-h-[min(700px,90vh)] w-[min(450px,calc(100%-32px))] sm:max-w-[450px] overflow-auto rounded-[6px] border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
              <DialogHeader>
                <DialogTitle className="font-game-pixel text-[22px] font-bold">Criar sala</DialogTitle>
                <DialogDescription className="my-3 text-xs leading-[1.5] text-[#9b97b2]">
                  Defina as regras da partida antes de chamar a alcateia.
                </DialogDescription>
              </DialogHeader>
              {configForm}
              <GameDialogFooter>
                <GameButton variant="special" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </GameButton>
                <GameButton variant="game" onClick={createRoom}>
                  Criar sala
                </GameButton>
              </GameDialogFooter>
            </DialogContent>
          </Dialog>
          <JoinRoomDialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen} pin={room} onPinChange={setRoom} onConfirm={joinRoom} />
        </main>
      </Shell>
    );

  if (finished)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Tempo certo" room={{ pin: room, players: roster }} />
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
                  <GameButton variant="game" onClick={() => startRound(1)}>
                    <RotateCcw /> Jogar novamente
                  </GameButton>
                  <GameButton variant="danger" onClick={closeRoom}>
                    <X /> Encerrar sala
                  </GameButton>
                </GameActions>
              )}
              {!isHost && (
                <GameActions>
                  <GameButton variant="special" onClick={leaveRoom}>
                    <LogOut /> Sair da sala
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
                    <Play /> Iniciar {roundCount} rodadas
                  </GameButton>
                  <GameButton variant="danger" onClick={closeRoom}>
                    <X /> Encerrar sala
                  </GameButton>
                </GameActions>
              ) : (
                <>
                  <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar o jogo.</p>
                  <GameActions>
                    <GameButton variant="special" onClick={leaveRoom}>
                      <LogOut /> Sair da sala
                    </GameButton>
                  </GameActions>
                </>
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
          <Dialog open={settingsOpen} onOpenChange={(open) => !open && closeSettings()}>
            <DialogContent className="max-h-[min(700px,90vh)] w-[min(450px,calc(100%-32px))] sm:max-w-[450px] overflow-auto rounded-[6px] border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
              <DialogHeader>
                <DialogTitle className="font-game-pixel text-[22px] font-bold">Configurações da sala</DialogTitle>
                <DialogDescription className="my-3 text-xs leading-[1.5] text-[#9b97b2]">
                  As mudanças valem para todos os jogadores da sala.
                </DialogDescription>
              </DialogHeader>
              {configForm}
              <GameDialogFooter>
                <GameButton variant="special" onClick={closeSettings}>
                  Cancelar
                </GameButton>
                <GameButton variant="game" onClick={saveSettings}>
                  Salvar alterações
                </GameButton>
              </GameDialogFooter>
            </DialogContent>
          </Dialog>
        </main>
      </Shell>
    );

  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Tempo certo" room={{ pin: room, players: roster }} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[700px] flex-col items-center gap-[18px]">
          <div className="mb-8 flex w-full flex-row items-end justify-between gap-4 sm:gap-8">
            <LedSign className="min-w-0 flex-1 text-center">
              Rodada {round} de {roundCount}
            </LedSign>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-3 rounded-md text-center">
              <span className="text-base text-[#c9c4dd]">Tempo alvo</span>
              <div className="w-full max-w-[280px] rounded-sm bg-[#ffe14a] px-3 py-4 font-heading text-[clamp(16px,5.2vw,30px)] font-bold tracking-normal text-[#12040a] shadow-[6px_6px_0_#ff4552] sm:px-7 sm:tracking-wide">
                {formatStopwatch(targetMilliseconds)}
              </div>
            </div>
          </div>
          <GameButton
            variant={roundResult !== null ? "success" : running ? "info" : "game"}
            className="h-auto min-h-[300px] w-full flex-col gap-[18px] rounded-md disabled:pointer-events-auto disabled:cursor-default"
            onClick={toggleTimer}
            disabled={roundResult !== null}>
            <time
              className={`font-heading text-[clamp(47px,11vw,92px)] leading-none tracking-[.04em] ${hideTargetOnStart && running ? "select-none blur-[20px]" : ""}`}>
              {formatStopwatch(elapsedMs)}
            </time>
            <span className="text-sm font-extrabold opacity-80">
              {roundResult === null ? (
                running ? (
                  "Toque para parar"
                ) : (
                  "Toque para iniciar"
                )
              ) : exactHit ? (
                <>
                  TEMPO EXATO! <GameIcon id="festa" size={20} className="inline-block align-middle" />
                </>
              ) : (
                `Excedente: ${formatStopwatch(roundResult)}`
              )}
            </span>
          </GameButton>
          {roundResult !== null && (
            <p
              className={`m-0 text-sm text-[#bdb7ce] ${exactHit ? "animate-[tada_.7s_both] font-extrabold text-[#fdcb6e]" : ""}`}>
              {exactHit ? "TADA! Você acertou o tempo exato!" : `Seu cronômetro marcou ${formatStopwatch(elapsedMs)}.`}
            </p>
          )}
          <Card className="w-full p-0">
            <CardContent className="p-[18px]">
              <span className="mb-2.5 block text-xs font-extrabold tracking-[.06em] text-[#bbb5d3]">
                PLACAR ACUMULADO
              </span>
              {Object.entries(players).map(([id, player]) => {
                const score = scores.find((item) => item.id === id);
                const status = submitted.includes(id)
                  ? "Finalizou"
                  : startedPlayers.includes(id)
                    ? "Cronômetro em andamento"
                    : "Ainda não iniciou";
                return (
                  <div className="flex justify-between border-t border-t-white/[.09] px-0.5 py-2.5" key={id}>
                    <strong>
                      {player.avatar} {player.name}
                    </strong>
                    <span
                      className={
                        submitted.includes(id) ? "font-heading font-bold text-[#fdcb6e]" : "text-xs text-[#a39dbb]"
                      }>
                      {score ? formatStopwatch(score.excessMs) : status}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          {isHost && (
            <>
              <GameActions>
                {round < roundCount ? (
                  <GameButton disabled={!allSubmitted} onClick={() => startRound(round + 1)}>
                    <SkipForward /> Próxima rodada
                  </GameButton>
                ) : (
                  <GameButton variant="warning" disabled={!allSubmitted} onClick={finishGame}>
                    <Trophy /> Ver pódio
                  </GameButton>
                )}
                <GameButton variant="danger" onClick={closeRoom}>
                  <X /> Encerrar sala
                </GameButton>
              </GameActions>
              {!allSubmitted && (
                <small className="w-full text-center my-5 text-xs text-[#bcb5cf]">Aguarde todos os participantes finalizarem.</small>
              )}
            </>
          )}
          {!isHost && (
            <GameActions>
              <GameButton variant="special" onClick={leaveRoom}>
                <LogOut /> Sair da sala
              </GameButton>
            </GameActions>
          )}
        </section>
      </main>
    </Shell>
  );
}
