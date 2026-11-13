import { useEffect, useMemo, useRef, useState } from "react";
import { LogIn, Play, Plus, RotateCcw } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { GameActions, GameDialogFooter, GameHeader, NumberStepper, Shell } from "@/components";
import { Label } from "@/components/ui/label";
import { BottomSheet } from "@/components/BottomSheet";
import { ErrorPage } from "@/components/ErrorPage";
import { CofreFrame, type CofreCell } from "@/components/games/CofreFrame";
import { GameButton } from "@/components/games/GameButton";
import { GameIcon } from "@/components/games/GameIcon";
import { LedSign } from "@/components/games/LedSign";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { PartialPodium } from "@/components/games/PartialPodium";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useOnline } from "@/hooks/useOnline";
import { isHostRoom, setHostRoom, useRestoreRoom } from "@/hooks/useRestoreRoom";
import { useRoomWake } from "@/hooks/useRoomWake";
import { playFailSound, playSuccessHorn, playTickSound } from "@/lib/audio";
import {
  applyGuess,
  createVault,
  digitScores,
  drawCode,
  formatElapsed,
  MAX_DIGITS,
  MIN_DIGITS,
  revealedDigits,
  visibleAttempts,
  type Attempt,
  type Vault,
  type VaultMode,
} from "@/lib/cofre-rules";
import { supabase } from "@/lib/realtime";
import { createRoomSync, syncStorageKey, type RoomSync } from "@/lib/room-sync";
import { useGameStore } from "@/lib/store";
import { createRoomPin, tabClientId } from "@/lib/utils";

type Person = { name: string; avatar: string };
type RoomConfig = { digits: number; mode: VaultMode };
type StartPayload = RoomConfig & { code: string; startedAt: number };
type GuessPayload = { playerId: string; guess: string; ms: number };

const digitsSchema = z.coerce
  .number()
  .int()
  .min(MIN_DIGITS, `Informe entre ${MIN_DIGITS} e ${MAX_DIGITS} dígitos.`)
  .max(MAX_DIGITS, `Informe entre ${MIN_DIGITS} e ${MAX_DIGITS} dígitos.`);

/** Quanto tempo as cores da última tentativa ficam no letreiro antes de os dígitos errados sumirem. */
const FLASH_MS = 1600;

const modeLabels: Record<VaultMode, string> = { shared: "Compartilhado", individual: "Individual" };

export function NumberGame() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [digits, setDigits] = useState(4);
  const [digitsInput, setDigitsInput] = useState("4");
  const [mode, setMode] = useState<VaultMode>("shared");
  const [digitsError, setDigitsError] = useState<string>();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, Person>>({});
  /** Todos que já passaram pela sala: quem sai continua nomeado no histórico e no pódio. */
  const [known, setKnown] = useState<Record<string, Person>>({});
  const [vault, setVault] = useState<Vault | null>(null);
  const [typed, setTyped] = useState("");
  /** Largada da partida (relógio do anfitrião) e o tempo corrente, para o contador. */
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  /** Última tentativa visível, colorida no letreiro por um instante. */
  const [flash, setFlash] = useState<Attempt | null>(null);
  const playerId = useRef(tabClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const syncRef = useRef<RoomSync | null>(null);
  const startedAtRef = useRef(0);
  startedAtRef.current = startedAt;
  const vaultRef = useRef(vault);
  vaultRef.current = vault;
  const settingsSnapshot = useRef<RoomConfig | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("number", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("number", restoredPin));
  });

  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const people = useMemo(() => ({ ...known, ...players }), [known, players]);
  const playerIds = Object.keys(players);
  const solved = Boolean(vault?.solvedBy);
  const nameOf = (id: string | null | undefined) => (id ? (people[id]?.name ?? "Jogador que saiu") : "");

  const applyConfig = (config: RoomConfig) => {
    setDigits(config.digits);
    setDigitsInput(String(config.digits));
    setMode(config.mode);
    setDigitsError(undefined);
  };
  const sharedRef = useRef({ isHost, config: { digits, mode } });
  sharedRef.current = { isHost, config: { digits, mode } };

  const resetLocal = () => {
    setVault(null);
    setTyped("");
    setFlash(null);
  };

  const reconnectKey = useRoomWake(channelRef, joined, () => void syncRef.current?.request());

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`number:${room}`, { config: { presence: { key: playerId.current } } });
    const sync = createRoomSync({
      channel,
      selfId: playerId.current,
      isHost: () => sharedRef.current.isHost,
      storageKey: syncStorageKey("number", room),
      resetEvents: ["start", "back-to-lobby"],
      handlers: {
        "update-config": (payload: RoomConfig) => applyConfig(payload),
        start: (payload: StartPayload) => {
          applyConfig(payload);
          setTyped("");
          setFlash(null);
          setStartedAt(payload.startedAt);
          setVault(createVault(payload.code, payload.mode));
        },
        guess: (payload: GuessPayload) =>
          setVault((current) => current && applyGuess(current, payload.playerId, payload.guess, payload.ms)),
        "back-to-lobby": () => {
          resetLocal();
          setLastRoom(room, "number");
        },
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
        resetLocal();
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
        setLastRoom(room, "number");
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

  // Minha tentativa nova: cores no letreiro por um instante; errada, buzina e dígitos errados piscando.
  const seenAttempts = useRef(0);
  const seenSolved = useRef<string | null>(null);
  useEffect(() => {
    const count = vault?.attempts.length ?? 0;
    const previous = seenAttempts.current;
    seenAttempts.current = count;
    if (!vault) {
      seenSolved.current = null;
      return;
    }
    if (vault.solvedBy && vault.solvedBy !== seenSolved.current) {
      seenSolved.current = vault.solvedBy;
      playSuccessHorn(soundEnabled);
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.55 }, colors: ["#ffd84a", "#ffb000", "#fff3b0", "#39ff7a"] });
      if ("vibrate" in navigator) navigator.vibrate([100, 60, 100, 60, 200]);
      return;
    }
    const last = vault.attempts[count - 1];
    if (count <= previous || !last || last.playerId !== playerId.current) return;
    playFailSound(soundEnabled);
    if ("vibrate" in navigator) navigator.vibrate([200, 80, 200]);
    setFlash(last);
    const timer = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(timer);
  }, [vault]);

  // Contador: corre até alguém abrir o cofre.
  useEffect(() => {
    if (!vault || solved) return;
    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [Boolean(vault), solved]);
  const elapsedMs = vault ? (vault.solvedMs ?? Math.max(0, now - startedAt)) : 0;

  const pressDigit = (digit: string) => {
    const current = vaultRef.current;
    if (!current || current.solvedBy) return;
    setFlash(null);
    setTyped((text) => {
      if (text.length >= current.digits) return text;
      playTickSound(soundEnabled);
      return text + digit;
    });
  };
  const deleteDigit = () => setTyped((text) => text.slice(0, -1));
  const submit = async () => {
    const current = vaultRef.current;
    if (!current || current.solvedBy || typed.length !== current.digits) return;
    const payload: GuessPayload = { playerId: playerId.current, guess: typed, ms: Date.now() - startedAtRef.current };
    setVault(applyGuess(current, payload.playerId, payload.guess, payload.ms));
    setTyped("");
    await syncRef.current?.send("guess", payload);
  };

  // Teclado físico.
  const keysRef = useRef({ pressDigit, deleteDigit, submit });
  keysRef.current = { pressDigit, deleteDigit, submit };
  useEffect(() => {
    if (!vault || solved) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^\d$/.test(event.key)) keysRef.current.pressDigit(event.key);
      else if (event.key === "Backspace") keysRef.current.deleteDigit();
      else if (event.key === "Enter") void keysRef.current.submit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [Boolean(vault), solved]);

  // Letreiro: dígitos descobertos em verde e fixos; a digitação em âmbar; a tentativa errada em verde e vermelho piscando.
  const cells: CofreCell[] = useMemo(() => {
    if (!vault) return [];
    const revealed = revealedDigits(vault, playerId.current);
    return Array.from({ length: vault.digits }, (_, index): CofreCell => {
      if (solved) return { char: vault.code[index], tone: "green" };
      if (flash) {
        const ok = flash.marks[index] === "ok";
        return { char: flash.guess[index], tone: ok ? "green" : "red", blink: !ok };
      }
      if (index < typed.length) return { char: typed[index], tone: "amber" };
      const known = revealed[index];
      return known ? { char: known, tone: "green" } : { char: " ", tone: "amber" };
    });
  }, [vault, solved, flash, typed]);

  const scores = useMemo(() => (vault ? digitScores(vault, Object.keys(people)) : {}), [vault, people]);
  /** Dobra a contagem para o desempate: no mesmo número de dígitos, quem abriu o cofre fica na frente. */
  const podiumPlayers = Object.keys(people)
    .filter((id) => id in players || (scores[id] ?? 0) > 0 || vault?.solvedBy === id)
    .map((id) => ({
      id,
      name: nameOf(id),
      avatar: people[id]?.avatar ?? "🐺",
      excessMs: (scores[id] ?? 0) * 2 + (vault?.solvedBy === id ? 1 : 0),
      note: vault?.solvedBy === id && vault.solvedMs !== null ? formatElapsed(vault.solvedMs) : undefined,
    }));

  const validateConfig = () => {
    const parsed = digitsSchema.safeParse(digitsInput);
    setDigitsError(parsed.success ? undefined : parsed.error.issues[0]?.message);
    if (!parsed.success) return null;
    const next: RoomConfig = { digits: parsed.data, mode };
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
    setHostRoom("number", newPin, true);
    setJoined(true);
    resetLocal();
    navigate(`?pin=${newPin}`);
  };

  const joinRoom = () => {
    if (!profile.name.trim() || !room.trim()) return;
    setRoomClosed(false);
    setIsHost(false);
    setJoined(true);
    resetLocal();
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

  /** O anfitrião sorteia o código (que ninguém vê no letreiro) e a ordem de jogada. */
  const start = async () => {
    const config = sharedRef.current.config;
    const payload: StartPayload = { ...config, code: drawCode(config.digits), startedAt: Date.now() };
    setTyped("");
    setFlash(null);
    seenAttempts.current = 0;
    setStartedAt(payload.startedAt);
    setNow(payload.startedAt);
    setVault(createVault(payload.code, payload.mode));
    await syncRef.current?.send("start", payload);
  };

  const backToLobby = async () => {
    resetLocal();
    seenAttempts.current = 0;
    setLastRoom(room, "number");
    await syncRef.current?.send("back-to-lobby");
  };

  const resetRoomState = () => {
    setJoined(false);
    setLastRoom(null, null);
    resetLocal();
    navigate({ search: "" }, { replace: true });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    syncRef.current?.clear();
    setHostRoom("number", room, false);
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
          Dígitos do cofre{" "}
          <NumberStepper
            ariaLabel="Quantidade de dígitos"
            min={MIN_DIGITS}
            max={MAX_DIGITS}
            value={digitsInput}
            onChange={setDigitsInput}
            onBlur={validateConfig}
            ariaInvalid={Boolean(digitsError)}
            ariaDescribedBy="digits-error"
          />
        </Label>
        {digitsError && (
          <small className="mt-1.5 block text-xs font-bold text-[#ff8fab]" id="digits-error">
            {digitsError}
          </small>
        )}
      </div>
      <div className="w-full text-base font-bold text-[#c2b9d1]">
        <span>Acertos</span>
        <div className="mt-2 flex w-full overflow-hidden rounded-md">
          {(["shared", "individual"] as const).map((option) => (
            <GameButton
              key={option}
              size="sm"
              type="button"
              className="min-w-0 flex-1 rounded-none"
              variant={mode === option ? "game" : "special"}
              aria-pressed={mode === option}
              onClick={() => setMode(option)}>
              {modeLabels[option]}
            </GameButton>
          ))}
        </div>
        <p className="mt-2 text-xs font-normal text-[#9b97b2]">
          {mode === "shared"
            ? "Os dígitos certos e o histórico aparecem para todos: a sala trabalha junta."
            : "Cada um vê só os próprios acertos e tentativas."}
        </p>
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
            title="Cofre"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="number"
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
              <GameIcon id="number" size={57} />
              <h2 className={roomHeadingClass}>Abra o cofre</h2>
              <p className={roomDescriptionClass}>
                Um código secreto trava o cofre. Todos digitam ao mesmo tempo: os dígitos certos acendem em verde,
                os errados em vermelho. Quem descobrir o código primeiro abre o cofre.
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
                game="number"
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
            description="Defina o cofre antes de chamar a alcateia."
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

  if (!vault)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader
            title="Cofre"
            room={{ pin: room, players: roster }}
            onSettings={isHost ? openSettings : undefined}
            leave={leaveConfig}
          />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <dl aria-label="Configurações da sala" className="grid w-full max-w-[340px] grid-cols-2 gap-2">
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Dígitos</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{digits}</dd>
              </div>
              <div className="rounded-md border border-[#4a34a8] bg-[#150d33] p-2.5">
                <dt className="text-[10px] tracking-[.12em] text-[#9b97b2] uppercase">Acertos</dt>
                <dd className="mt-1 font-game-pixel text-sm text-white">{modeLabels[mode]}</dd>
              </div>
            </dl>
            {isHost ? (
              <GameActions>
                <GameButton variant="game" disabled={playerIds.length < 1} onClick={start}>
                  <Play /> Iniciar
                </GameButton>
              </GameActions>
            ) : (
              <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar o jogo.</p>
            )}
            <RoomDirectory
              game="number"
              isHosting={isHost}
              showList={false}
              hostName={profile.name}
              hostAvatar={profile.avatar}
              pin={room}
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

  const history = visibleAttempts(vault, playerId.current).slice().reverse();
  const status = solved ? "COFRE ABERTO!" : "DIGITE O CÓDIGO";
  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Cofre" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[560px] flex-col items-center gap-6">
          {solved && (
            <h2 className="neon-text text-center font-game-pixel text-xl">
              {people[vault.solvedBy!]?.avatar} {nameOf(vault.solvedBy)} abriu o cofre!
            </h2>
          )}
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-sm text-[#c9c4dd]">{solved ? "Tempo para abrir" : "Tempo"}</span>
            <LedSign color={solved ? "#ffd84a" : "#00e5ff"} blinkEvery={solved ? 2 : 4} className="min-w-[140px] text-center">
              {formatElapsed(elapsedMs)}
            </LedSign>
          </div>

          <CofreFrame
            cells={cells}
            locked={solved}
            canSubmit={typed.length === vault.digits}
            opened={solved}
            status={status}
            onDigit={pressDigit}
            onDelete={deleteDigit}
            onSubmit={submit}
          />

          {solved ? (
            <>
              <p className="text-sm text-[#c9c4dd]">
                O código era <strong className="font-game-pixel text-[#ffd84a]">{vault.code}</strong>
              </p>
              <h3 className="font-heading text-[22px] font-bold">Quem acertou mais dígitos</h3>
              <PartialPodium
                players={podiumPlayers}
                previousOrder={null}
                selfId={playerId.current}
                higherIsBetter
                format={(value) => {
                  const hits = Math.floor(value / 2);
                  return `${hits} ${hits === 1 ? "dígito" : "dígitos"}`;
                }}
              />
              {isHost && (
                <GameActions>
                  <GameButton variant="game" onClick={backToLobby}>
                    <RotateCcw /> Jogar novamente
                  </GameButton>
                </GameActions>
              )}
            </>
          ) : (
            <div className="w-full">
              <h3 className="mb-2 text-center text-base font-bold text-[#c2b9d1]">Histórico de combinações</h3>
              {history.length === 0 ? (
                <p className="text-center text-sm text-[#9b97b2]">Nenhuma combinação digitada ainda.</p>
              ) : (
                <ol aria-label="Histórico de combinações" className="grid gap-2">
                  {history.map((attempt, index) => (
                    <li
                      key={history.length - index}
                      className="flex items-center justify-between gap-3 rounded-md border border-[#4a34a8] bg-[#150d33] px-3 py-2">
                      <span className="min-w-0 truncate text-sm text-[#c2b9d1]">
                        {people[attempt.playerId]?.avatar} {nameOf(attempt.playerId)}
                      </span>
                      <span className="flex gap-1 font-game-pixel text-lg">
                        {Array.from(attempt.guess, (digit, position) => (
                          <span key={position} className={attempt.marks[position] === "ok" ? "text-[#39ff7a]" : "text-[#ff4552]"}>
                            {digit}
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
              {!isHost && <p className={`${roomDescriptionClass} mt-4`}>Quem descobrir o código primeiro abre o cofre.</p>}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}
