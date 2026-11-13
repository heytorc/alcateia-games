import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, LogIn, Play, Plus, RotateCcw, SkipForward, Trophy } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { celebrate, GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/BottomSheet";
import { ErrorPage } from "@/components/ErrorPage";
import { GameButton } from "@/components/games/GameButton";
import { GameIcon } from "@/components/games/GameIcon";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { LedSign } from "@/components/games/LedSign";
import { PartialPodium, podiumOrder } from "@/components/games/PartialPodium";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";
import { tabooCards as bundledCards, type TabooCard } from "@/constants/taboo-cards";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOnline } from "@/hooks/useOnline";
import { isHostRoom, setHostRoom, useRestoreRoom } from "@/hooks/useRestoreRoom";
import { useRoomWake } from "@/hooks/useRoomWake";
import { useTabooCards } from "@/hooks/useWords";
import { playSuccessHorn, playTickSound, playTimerEndSound } from "@/lib/audio";
import {
  buildRound,
  currentCard,
  describerId,
  resolveTurn,
  roundOver,
  type TabooRound,
} from "@/lib/proibidas-rules";
import { supabase } from "@/lib/realtime";
import { createRoomSync, syncStorageKey, type RoomSync } from "@/lib/room-sync";
import { useGameStore } from "@/lib/store";
import { createRoomPin, tabClientId } from "@/lib/utils";

type Mode = "timed" | "free";
type Person = { name: string; avatar: string };
type RoomConfig = { roundCount: number; mode: Mode; seconds: number };
type RoundStartPayload = RoomConfig & {
  round: number;
  order: string[];
  cards: TabooCard[];
  hits: Record<string, number>;
};
type TurnResultPayload = { round: number; turn: number; guesserId: string | null };

const configSchema = z.object({
  roundCount: z.coerce.number().int().min(1, "Informe entre 1 e 10 rodadas.").max(10, "Informe entre 1 e 10 rodadas."),
  seconds: z.coerce.number().int().min(15, "Informe entre 15 e 180 segundos.").max(180, "Informe entre 15 e 180 segundos."),
});

/** Folga para o anfitrião cobrir um descritor que sumiu, antes de passar a vez sem ponto. */
const TIMEOUT_GRACE_MS = 2500;
const ABSENT_DESCRIBER_MS = 6000;

export function ProibidasGame() {
  const navigate = useNavigate();
  const cards = useTabooCards(bundledCards);
  const [room, setRoom] = useState("");
  const [roundCount, setRoundCount] = useState(3);
  const [roundCountInput, setRoundCountInput] = useState("3");
  const [mode, setMode] = useState<Mode>("timed");
  const [seconds, setSeconds] = useState(60);
  const [secondsInput, setSecondsInput] = useState("60");
  const [configErrors, setConfigErrors] = useState<{ roundCount?: string; seconds?: string }>({});
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, Person>>({});
  /** Todos que já passaram pela sala: quem sai continua aparecendo no pódio. */
  const [known, setKnown] = useState<Record<string, Person>>({});
  /** Rodada em curso (`null` no lobby) e os acertos de antes dela, para animar o pódio parcial. */
  const [game, setGame] = useState<TabooRound<TabooCard> | null>(null);
  const [startHits, setStartHits] = useState<Record<string, number>>({});
  const [finished, setFinished] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const playerId = useRef(tabClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const syncRef = useRef<RoomSync | null>(null);
  const gameRef = useRef(game);
  gameRef.current = game;
  const usedCards = useRef<string[]>([]);
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const firedTurn = useRef<string | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("proibidas", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("proibidas", restoredPin));
  });

  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const people = useMemo(() => ({ ...known, ...players }), [known, players]);
  const playerIds = Object.keys(players);
  const round = game?.round ?? 0;
  const over = game ? roundOver(game) : false;
  const describer = game && !over ? describerId(game) : null;
  const card = game && !over ? currentCard(game) : null;
  const isDescriber = describer === playerId.current;
  const podiumPlayers = useMemo(
    () =>
      Object.keys(game?.hits ?? {})
        .concat(game?.order ?? [])
        .filter((id, index, all) => all.indexOf(id) === index)
        .map((id) => ({
          id,
          name: people[id]?.name ?? "Jogador que saiu",
          avatar: people[id]?.avatar ?? "🐺",
          excessMs: game?.hits[id] ?? 0,
        })),
    [game, people],
  );
  const previousOrder = useMemo(
    () => podiumOrder(podiumPlayers.map((player) => ({ ...player, excessMs: startHits[player.id] ?? 0 })), true),
    [podiumPlayers, startHits],
  );

  useEffect(() => {
    if (finished) {
      celebrate();
      playSuccessHorn(soundEnabled);
    }
    // o som só toca ao entrar no resultado final
  }, [finished]);

  const applyRoundStart = (payload: RoundStartPayload) => {
    setGame({ round: payload.round, order: payload.order, cards: payload.cards, turn: 0, hits: payload.hits });
    setStartHits(payload.hits);
    setRoundCount(payload.roundCount);
    setRoundCountInput(String(payload.roundCount));
    setMode(payload.mode);
    setSeconds(payload.seconds);
    setSecondsInput(String(payload.seconds));
    setFinished(false);
  };

  const applyTurnResult = (payload: TurnResultPayload) =>
    setGame((current) => (current && current.round === payload.round ? resolveTurn(current, payload.turn, payload.guesserId) : current));

  const applyLobbyReset = () => {
    usedCards.current = [];
    setGame(null);
    setStartHits({});
    setFinished(false);
    setLastRoom(room, "proibidas");
  };

  const applyConfig = (config: RoomConfig) => {
    setRoundCount(config.roundCount);
    setRoundCountInput(String(config.roundCount));
    setMode(config.mode);
    setSeconds(config.seconds);
    setSecondsInput(String(config.seconds));
    setConfigErrors({});
  };
  const sharedRef = useRef({ isHost, config: { roundCount, mode, seconds } });
  sharedRef.current = { isHost, config: { roundCount, mode, seconds } };

  const reconnectKey = useRoomWake(channelRef, joined, () => void syncRef.current?.request());

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`proibidas:${room}`, { config: { presence: { key: playerId.current } } });
    const sync = createRoomSync({
      channel,
      selfId: playerId.current,
      isHost: () => sharedRef.current.isHost,
      storageKey: syncStorageKey("proibidas", room),
      resetEvents: ["round-start", "back-to-lobby"],
      handlers: {
        "update-config": (payload: RoomConfig) => applyConfig(payload),
        "round-start": (payload: RoundStartPayload) => applyRoundStart(payload),
        "turn-result": (payload: TurnResultPayload) => applyTurnResult(payload),
        "back-to-lobby": applyLobbyReset,
        "game-finished": () => setFinished(true),
      },
    });
    syncRef.current = sync;
    const syncLobby = () => {
      const presence = channel.presenceState<Person>();
      const current = Object.fromEntries(
        Object.entries(presence).map(([id, entries]) => [
          id,
          { name: entries[0]?.name ?? "Jogador", avatar: entries[0]?.avatar ?? "🐺" },
        ]),
      );
      setPlayers(current);
      setKnown((previous) => ({ ...previous, ...current }));
    };
    channel
      .on("presence", { event: "sync" }, syncLobby)
      .on("presence", { event: "join" }, syncLobby)
      .on("presence", { event: "leave" }, syncLobby);
    sync.attach();
    channel
      .on("broadcast", { event: "room-closed" }, () => {
        sync.clear();
        setJoined(false);
        setRoomClosed(true);
        setGame(null);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
        setLastRoom(room, "proibidas");
        syncLobby();
        // Reconectou ou recarregou: o anfitrião retoma a partida salva; os demais pedem a atual a ele.
        if (sharedRef.current.isHost) sync.restore();
        else void sync.request();
      });
    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room, reconnectKey]);

  /** Fecha a vez em curso; só o descritor (ou o anfitrião, como reserva) chama. */
  const resolve = async (guesserId: string | null) => {
    const current = gameRef.current;
    if (!current || roundOver(current)) return;
    const payload: TurnResultPayload = { round: current.round, turn: current.turn, guesserId };
    firedTurn.current = `${payload.round}:${payload.turn}`;
    applyTurnResult(payload);
    if (guesserId) playTickSound(soundEnabled);
    await syncRef.current?.send("turn-result", payload);
  };

  // Relógio da palavra (modo com tempo). O descritor encerra a própria vez; o anfitrião cobre se ele sumir.
  const turnKey = game && !over ? `${game.round}:${game.turn}` : null;
  useEffect(() => {
    if (mode !== "timed" || !turnKey) return;
    const startedAt = performance.now();
    const limit = seconds * 1000;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      const left = Math.max(0, Math.ceil((limit - elapsed) / 1000));
      setSecondsLeft(left);
      if (left > 0 && left <= 5) playTickSound(useGameStore.getState().soundEnabled);
      const current = gameRef.current;
      if (!current || firedTurn.current === turnKey) return;
      const mine = describerId(current) === playerId.current;
      if (elapsed < limit + (mine ? 0 : TIMEOUT_GRACE_MS) || !(mine || sharedRef.current.isHost)) return;
      playTimerEndSound(useGameStore.getState().soundEnabled);
      void resolve(null);
    };
    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
    // `resolve` lê o estado pelas refs
  }, [turnKey, mode, seconds]);

  // Descritor fora da sala trava a rodada: o anfitrião passa a vez dele sem ponto, após uma folga.
  const describerPresent = describer === null || describer in players;
  useEffect(() => {
    if (!isHost || !turnKey || describerPresent) return;
    const timer = setTimeout(() => void resolve(null), ABSENT_DESCRIBER_MS);
    return () => clearTimeout(timer);
    // `resolve` lê o estado pelas refs
  }, [isHost, turnKey, describerPresent]);

  const validateConfig = () => {
    const parsed = configSchema.safeParse({ roundCount: roundCountInput, seconds: secondsInput });
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      setConfigErrors({ roundCount: errors.roundCount?.[0], seconds: errors.seconds?.[0] });
      return null;
    }
    setConfigErrors({});
    const next: RoomConfig = { ...parsed.data, mode };
    applyConfig(next);
    return next;
  };

  const joinListedRoom = (listedRoom: string) => {
    if (!profile.name.trim()) return;
    setRoom(listedRoom);
    setIsHost(false);
    setJoined(true);
  };

  const createRoom = () => {
    if (!profile.name.trim()) return;
    if (validateConfig() === null) return;
    setCreateDialogOpen(false);
    const newPin = createRoomPin();
    setRoom(newPin);
    setRoomClosed(false);
    setIsHost(true);
    setHostRoom("proibidas", newPin, true);
    setJoined(true);
    setFinished(false);
    navigate(`?pin=${newPin}`);
  };

  const joinRoom = () => {
    if (!profile.name.trim() || !room.trim()) return;
    setRoomClosed(false);
    setIsHost(false);
    setJoined(true);
    setFinished(false);
    navigate(`?pin=${room}`);
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
    const next = validateConfig();
    if (!next) return;
    setSettingsOpen(false);
    await syncRef.current?.send("update-config", next);
  };

  const startRound = async (nextRound = 1) => {
    if (nextRound === 1) usedCards.current = [];
    const previousHits = nextRound === 1 ? {} : (gameRef.current?.hits ?? {});
    const built = buildRound(nextRound, playerIds, cards, usedCards.current, previousHits);
    usedCards.current = built.used;
    const payload: RoundStartPayload = {
      ...sharedRef.current.config,
      round: nextRound,
      order: built.state.order,
      cards: built.state.cards,
      hits: previousHits,
    };
    applyRoundStart(payload);
    await syncRef.current?.send("round-start", payload);
  };

  const backToLobby = async () => {
    applyLobbyReset();
    await syncRef.current?.send("back-to-lobby");
  };

  const finishGame = async () => {
    setFinished(true);
    setLastRoom(null, null);
    await syncRef.current?.send("game-finished");
  };

  const resetRoomState = () => {
    usedCards.current = [];
    setJoined(false);
    setLastRoom(null, null);
    setFinished(false);
    setGame(null);
    setStartHits({});
    navigate({ search: "" }, { replace: true });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    syncRef.current?.clear();
    setHostRoom("proibidas", room, false);
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
            max={10}
            value={roundCountInput}
            onChange={setRoundCountInput}
            onBlur={validateConfig}
            ariaInvalid={Boolean(configErrors.roundCount)}
            ariaDescribedBy="round-count-error"
          />
        </Label>
        {configErrors.roundCount && (
          <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="round-count-error">
            {configErrors.roundCount}
          </small>
        )}
        <p className="mt-1 text-xs text-[#9b97b2]">Em cada rodada, todos descrevem uma palavra, em ordem sorteada.</p>
      </div>
      <div className="w-full text-base font-bold text-[#c2b9d1]">
        <span>Modo</span>
        <div className="mt-2 flex w-full overflow-hidden rounded-md">
          <GameButton
            size="sm"
            type="button"
            className="min-w-0 flex-1 rounded-none"
            variant={mode === "timed" ? "game" : "special"}
            aria-pressed={mode === "timed"}
            onClick={() => setMode("timed")}>
            Tempo por palavra
          </GameButton>
          <GameButton
            size="sm"
            type="button"
            className="min-w-0 flex-1 rounded-none"
            variant={mode === "free" ? "game" : "special"}
            aria-pressed={mode === "free"}
            onClick={() => setMode("free")}>
            Livre
          </GameButton>
        </div>
      </div>
      {mode === "timed" ? (
        <div className="w-full">
          <Label className="justify-between text-base font-bold text-[#c2b9d1]">
            Segundos por palavra{" "}
            <NumberStepper
              ariaLabel="Segundos por palavra"
              min={15}
              max={180}
              step={5}
              value={secondsInput}
              onChange={setSecondsInput}
              onBlur={validateConfig}
              ariaInvalid={Boolean(configErrors.seconds)}
              ariaDescribedBy="seconds-error"
            />
          </Label>
          {configErrors.seconds && (
            <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="seconds-error">
              {configErrors.seconds}
            </small>
          )}
        </div>
      ) : (
        <p className="text-xs text-[#9b97b2]">Sem relógio: quem descreve encerra a própria vez.</p>
      )}
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
            title="Palavras proibidas"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="proibidas"
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
              <GameIcon id="proibidas" size={57} />
              <h2 className={roomHeadingClass}>Descreva sem falar</h2>
              <p className={roomDescriptionClass}>
                Na sua vez, você recebe uma palavra e uma lista de palavras proibidas. Faça a alcateia adivinhar sem
                dizer nenhuma delas e marque quem acertou. A ordem é sorteada a cada rodada.
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
                game="proibidas"
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

  if (finished && game)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Palavras proibidas" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <section className="mx-auto my-[35px] flex w-full max-w-[600px] flex-col items-center gap-6 text-center">
            <Trophy className="text-[#fdcb6e]" size={48} />
            <Badge variant="outline">RESULTADO FINAL</Badge>
            <h2 className="font-heading text-[30px] font-bold">Quem mais acertou</h2>
            <PartialPodium
              players={podiumPlayers}
              previousOrder={null}
              selfId={playerId.current}
              higherIsBetter
              format={(hits) => `${hits} ${hits === 1 ? "acerto" : "acertos"}`}
            />
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

  if (!game)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader
            title="Palavras proibidas"
            room={{ pin: room, players: roster }}
            onSettings={isHost ? openSettings : undefined}
            leave={leaveConfig}
          />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <dl aria-label="Configurações da sala" className="grid w-full max-w-[340px] grid-cols-2 gap-2">
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Rodadas</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{roundCount}</dd>
              </div>
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Tempo</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{mode === "timed" ? `${seconds}s` : "Livre"}</dd>
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
              game="proibidas"
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

  // Fim da rodada: todos já descreveram. Pódio parcial, e o anfitrião segue.
  if (over)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Palavras proibidas" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[600px] flex-col items-center gap-6">
            <LedSign className="w-full max-w-[220px] text-center">
              {round}/{roundCount}
            </LedSign>
            <h2 className="font-heading text-[26px] font-bold">Pódio parcial</h2>
            <PartialPodium
              players={podiumPlayers}
              previousOrder={previousOrder}
              selfId={playerId.current}
              higherIsBetter
              format={(hits) => `${hits} ${hits === 1 ? "acerto" : "acertos"}`}
            />
            {isHost ? (
              <GameActions>
                {round < roundCount ? (
                  <GameButton onClick={() => startRound(round + 1)}>
                    <SkipForward /> Próxima rodada
                  </GameButton>
                ) : (
                  <GameButton variant="warning" onClick={finishGame}>
                    <Trophy /> Ver resultado
                  </GameButton>
                )}
              </GameActions>
            ) : (
              <p className={roomDescriptionClass}>Aguarde o anfitrião seguir.</p>
            )}
          </section>
        </main>
      </Shell>
    );

  const describerPerson = describer ? people[describer] : undefined;
  const guessers = playerIds.filter((id) => id !== describer);
  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Palavras proibidas" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 py-6">
          <div className="flex w-full items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <span className="text-sm text-[#c9c4dd]">Rodada</span>
              <LedSign className="w-full text-center">
                {round}/{roundCount}
              </LedSign>
            </div>
            {mode === "timed" && (
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
                <span className="text-sm text-[#c9c4dd]">Tempo</span>
                <LedSign className="w-full text-center" color={secondsLeft <= 5 ? "#ff4552" : "#00e5ff"} blinkEvery={secondsLeft <= 5 ? 1 : 4}>
                  {secondsLeft}s
                </LedSign>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-[#c9c4dd]" aria-live="polite">
            Vez {game.turn + 1}/{game.order.length}: {describerPerson?.avatar ?? "🐺"}{" "}
            <strong>{isDescriber ? "você" : (describerPerson?.name ?? "jogador")}</strong>
          </p>

          {isDescriber && card ? (
            <>
              <article
                aria-live="polite"
                className="neon-box flex w-full flex-col gap-6 rounded-md border border-[#4a34a8] bg-[#150d33] p-6 text-center [--neon-c:#ff9f43]">
                <div className="flex flex-col gap-2">
                  <p className="text-xs tracking-[.12em] text-[#9b97b2] uppercase">Descreva</p>
                  <h2 className="font-game-pixel text-[clamp(22px,7vw,40px)] leading-tight break-words text-white">
                    {card.word}
                  </h2>
                </div>
                <div className="flex flex-col gap-3">
                  <p className="flex items-center justify-center gap-2 text-xs tracking-[.12em] text-[#ff8fab] uppercase">
                    <Ban size={14} /> Não pode falar
                  </p>
                  <ul className="grid gap-2">
                    {card.forbidden.map((word) => (
                      <li key={word} className="rounded-sm bg-[#2a0f2a] px-3 py-1.5 font-game-pixel text-sm text-[#ffb3c7]">
                        {word}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
              <div className="flex w-full flex-col gap-3">
                <h3 className="text-center text-base font-bold text-[#c2b9d1]">Quem acertou?</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {guessers.map((id) => (
                    <GameButton key={id} variant="info" size="sm" className="min-w-0 truncate" onClick={() => resolve(id)}>
                      {people[id]?.avatar} {people[id]?.name}
                      {game.hits[id] ? <Badge className="ml-1 bg-[#0d0b1f] text-white">{game.hits[id]}</Badge> : null}
                    </GameButton>
                  ))}
                </div>
              </div>
              <GameActions>
                <GameButton variant="special" onClick={() => resolve(null)}>
                  <SkipForward /> Ninguém acertou
                </GameButton>
              </GameActions>
            </>
          ) : (
            <article
              aria-live="polite"
              className="neon-box flex w-full flex-col items-center gap-4 rounded-md border border-[#4a34a8] bg-[#150d33] p-8 text-center [--neon-c:#ff9f43]">
              <span className="text-6xl leading-none">{describerPerson?.avatar ?? "🐺"}</span>
              <h2 className="font-game-pixel text-xl text-white">{describerPerson?.name ?? "Jogador"} está descrevendo</h2>
              <p className="text-sm text-[#c2b9d1]">Adivinhe a palavra! Quem descreve vai marcar quem acertou.</p>
            </article>
          )}
        </section>
      </main>
    </Shell>
  );
}
