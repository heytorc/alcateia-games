import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LogIn, Play, Plus, RotateCcw, SkipForward } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { celebrate, GameActions, GameHeader, Shell } from "@/components";
import { Badge } from "@/components/ui/badge";
import { playExplosionSound, playSuccessHorn, playTickSound } from "@/lib/audio";
import { supabase } from "@/lib/realtime";
import {
  mistakeReplay,
  nextLevel,
  play,
  removePlayer,
  startGame,
  STARTING_LIVES,
  type OrdemState,
  type ReplayEntry,
} from "@/lib/ordem-silenciosa-rules";
import { createRoomPin, tabClientId } from "@/lib/utils";
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
import type { PlayerListItem } from "@/components/games/PlayerList";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";
import { CardTable, MistakeReplay, PlayingCard, type Seat } from "@/components/games/OrdemTable";

type Person = { name: string; avatar: string };
/**
 * A presença só diz quem está na sala (e quem é o anfitrião). O estado da partida vai por broadcast: regravar a
 * presença a cada jogada fazia outros aparelhos perderem o anfitrião da lista por alguns instantes.
 */
type OrdemPresence = Person & { host?: boolean };

/** Cópia local da partida no aparelho do anfitrião: se a página dele recarregar, a partida continua. */
const savedGameKey = (pin: string) => `alcateia-ordem-${pin}`;
function readSavedGame(pin: string): OrdemState | null {
  try {
    return JSON.parse(localStorage.getItem(savedGameKey(pin)) ?? "null") as OrdemState | null;
  } catch {
    return null;
  }
}
function writeSavedGame(pin: string, game: OrdemState | null) {
  try {
    if (game) localStorage.setItem(savedGameKey(pin), JSON.stringify(game));
    else localStorage.removeItem(savedGameKey(pin));
  } catch {
    // armazenamento cheio ou bloqueado: a partida segue só na memória
  }
}

export function OrdemGame() {
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [joined, setJoined] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [roomClosed, setRoomClosed] = useState(false);
  const online = useOnline();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Record<string, Person>>({});
  /** Todos que já passaram pela sala, para nomear quem errou mesmo depois de sair. */
  const [known, setKnown] = useState<Record<string, Person>>({});
  const [game, setGame] = useState<OrdemState | null>(null);
  /** Só o anfitrião processa jogadas: sem ele na lista da sala, a mesa avisa (o toque continua sendo enviado). */
  const [hostOnline, setHostOnline] = useState(true);
  /** A presença pode oscilar por um instante numa reconexão: o aviso só aparece se o anfitrião sumir por mais tempo. */
  const [hostAway, setHostAway] = useState(false);
  useEffect(() => {
    if (hostOnline) {
      setHostAway(false);
      return;
    }
    const timer = window.setTimeout(() => setHostAway(true), 3000);
    return () => window.clearTimeout(timer);
  }, [hostOnline]);
  /** Replay do último erro por cima da mesa (`id` reinicia a animação a cada erro). */
  const [replay, setReplay] = useState<{ id: number; entries: ReplayEntry[] } | null>(null);
  const closeReplay = useCallback(() => setReplay(null), []);
  // id estável na aba: quem recarrega a página continua com a mesma mão
  const playerId = useRef(tabClientId());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const gameRef = useRef<OrdemState | null>(null);
  gameRef.current = game;
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  useRestoreRoom("ordem", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("ordem", restoredPin));
  });

  const roster: PlayerListItem[] = Object.entries(players).map(([id, player]) => ({
    id,
    ...player,
    tag: id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const people = useMemo(() => ({ ...known, ...players }), [known, players]);
  const nameOf = (id: string) => people[id]?.name ?? "Jogador que saiu";
  const personOf = useCallback((id: string) => people[id] ?? { name: "Jogador que saiu", avatar: "🐺" }, [people]);
  const myHand = game?.hands[playerId.current] ?? [];
  const lastPlayed = game?.pile.at(-1);

  // Feedback de cada mudança de estado (erro, nível concluído, fim de jogo) em todos os aparelhos.
  const previous = useRef<OrdemState | null>(null);
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    if (!game || !before) return;
    if (game.lives < before.lives) {
      setReplay({ id: Date.now(), entries: mistakeReplay(game) });
      playExplosionSound(soundEnabled);
      if ("vibrate" in navigator) navigator.vibrate([80, 60, 80]);
    } else if (game.pile.length > before.pile.length) playTickSound(soundEnabled);
    // sem confete quando o nível fecha justamente por um erro (o replay do erro já ocupa a mesa)
    const cleanFinish = game.lives === before.lives && (game.status === "level-done" || game.status === "won");
    if (game.status !== before.status && cleanFinish) {
      celebrate();
      playSuccessHorn(soundEnabled);
    }
  }, [game, soundEnabled]);

  /** Só o anfitrião muda o estado: aplica, guarda numa cópia local e transmite a todos. */
  const publish = async (next: OrdemState | null) => {
    setGame(next);
    gameRef.current = next;
    writeSavedGame(room, next);
    await channelRef.current?.send({ type: "broadcast", event: "state", payload: { game: next } });
  };
  const sharedRef = useRef({ isHost, publish });
  sharedRef.current = { isHost, publish };

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`ordem:${room}`, { config: { presence: { key: playerId.current } } });
    const syncLobby = () => {
      const presence = channel.presenceState<OrdemPresence>();
      const current = Object.fromEntries(
        Object.entries(presence).map(([id, entries]) => [
          id,
          { name: entries[0]?.name ?? "Jogador", avatar: entries[0]?.avatar ?? "🐺" },
        ]),
      );
      setPlayers(current);
      setKnown((previous) => ({ ...previous, ...current }));
      setHostOnline(
        Object.values(presence)
          .flat()
          .some((entry) => entry.host),
      );
    };
    channel
      .on("presence", { event: "sync" }, syncLobby)
      .on("presence", { event: "join" }, () => {
        syncLobby();
        // Quem chega (ou volta) recebe a partida em andamento.
        const current = gameRef.current;
        if (sharedRef.current.isHost && current)
          void channel.send({ type: "broadcast", event: "state", payload: { game: current } });
      })
      .on("presence", { event: "leave" }, ({ key }: { key: string }) => {
        syncLobby();
        const current = gameRef.current;
        // Atualizar a presença (track) também gera um "leave" da mesma chave: só sai quem sumiu do estado.
        const gone = !(key in channel.presenceState());
        if (gone && sharedRef.current.isHost && current && key in current.hands)
          void sharedRef.current.publish(removePlayer(current, key));
      })
      .on("broadcast", { event: "state" }, ({ payload }: { payload: { game: OrdemState | null } }) => {
        if (!sharedRef.current.isHost) setGame(payload.game);
      })
      .on("broadcast", { event: "sync-request" }, () => {
        const current = gameRef.current;
        if (sharedRef.current.isHost && current)
          void channel.send({ type: "broadcast", event: "state", payload: { game: current } });
      })
      .on("broadcast", { event: "play-request" }, ({ payload }: { payload: { playerId: string } }) => {
        const current = gameRef.current;
        if (sharedRef.current.isHost && current) void sharedRef.current.publish(play(current, payload.playerId));
      })
      .on("broadcast", { event: "room-closed" }, () => {
        setJoined(false);
        setRoomClosed(true);
        setGame(null);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status !== "SUBSCRIBED") return;
        setLastRoom(room, "ordem");
        const host = sharedRef.current.isHost;
        // A presença é gravada uma vez por conexão; a partida não vai nela.
        await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room, ...(host ? { host: true } : {}) });
        syncLobby();
        // O anfitrião que voltou (recarregou a página, reconectou) retoma a partida e ressincroniza todos;
        // os demais pedem o estado atual a ele.
        const resumed = host ? (gameRef.current ?? readSavedGame(room)) : null;
        if (resumed) await sharedRef.current.publish(resumed);
        if (!host) await channel.send({ type: "broadcast", event: "sync-request", payload: {} });
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
    const newPin = createRoomPin();
    setRoom(newPin);
    setRoomClosed(false);
    setIsHost(true);
    setHostRoom("ordem", newPin, true);
    setJoined(true);
    navigate(`?pin=${newPin}`);
  };

  const joinRoom = () => {
    if (!profile.name.trim() || !room.trim()) return;
    setRoomClosed(false);
    setIsHost(false);
    setJoined(true);
    navigate(`?pin=${room}`);
  };

  const playCard = async () => {
    if (!game || game.status !== "playing" || myHand.length === 0) return;
    if (isHost) await publish(play(game, playerId.current));
    else await channelRef.current?.send({ type: "broadcast", event: "play-request", payload: { playerId: playerId.current } });
  };

  const resetRoomState = () => {
    setJoined(false);
    setLastRoom(null, null);
    setGame(null);
    navigate({ search: "" }, { replace: true });
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    setHostRoom("ordem", room, false);
    writeSavedGame(room, null);
    resetRoomState();
  };

  const leaveRoom = async () => {
    const channel = channelRef.current;
    if (channel && supabase) await supabase.removeChannel(channel);
    resetRoomState();
  };

  const leaveConfig = { host: isHost, onConfirm: isHost ? closeRoom : leaveRoom };
  const playerIds = Object.keys(players);

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
            title="Ordem silenciosa"
            actions={
              !isDesktop && (
                <RoomDirectory
                  variant="drawer"
                  game="ordem"
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
              <GameIcon id="ordem" size={57} />
              <h2 className={roomHeadingClass}>Em ordem, sem falar</h2>
              <p className={roomDescriptionClass}>
                Cooperativo: cada um recebe cartas de 1 a 100 e o grupo precisa jogar todas em ordem crescente, sem
                conversar. Você só joga a sua carta mais baixa. Se alguém jogar enquanto outro tinha uma menor, o grupo
                perde uma vida.
              </p>
              {!profile.name && (
                <p className="text-sm text-[#ffd0d0]">
                  Defina seu nome pelo perfil na barra superior antes de entrar em uma sala.
                </p>
              )}
              <GameActions className="md:mx-0 md:justify-start">
                <GameButton variant="game" onClick={createRoom}>
                  <Plus /> Criar sala
                </GameButton>
                <GameButton variant="info" onClick={() => setJoinDialogOpen(true)}>
                  <LogIn /> Entrar na sala
                </GameButton>
              </GameActions>
            </div>
            {isDesktop && (
              <RoomDirectory
                game="ordem"
                isHosting={false}
                hostName=""
                hostAvatar=""
                pin=""
                disabled={!profile.name.trim()}
                onJoin={joinListedRoom}
              />
            )}
          </section>
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

  if (!game)
    return (
      <Shell>
        <main className={roomPageClass}>
          <GameHeader title="Ordem silenciosa" room={{ pin: room, players: roster }} leave={leaveConfig} />
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
            <h2 className={roomHeadingClass}>Alcateia reunida</h2>
            <WolfFieldLobby players={roster} />
            <p className={roomDescriptionClass}>
              {STARTING_LIVES} vidas · nível 1 começa com uma carta para cada um · último nível:{" "}
              {playerIds.length <= 2 ? 12 : playerIds.length === 3 ? 10 : 8}
            </p>
            {isHost ? (
              <GameActions>
                <GameButton variant="game" disabled={playerIds.length < 2} onClick={() => publish(startGame(playerIds))}>
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
              game="ordem"
              isHosting={isHost}
              showList={false}
              hostName={profile.name}
              hostAvatar={profile.avatar}
              pin={room}
              onJoin={() => undefined}
            />
          </div>
        </main>
      </Shell>
    );

  const over = game.status === "won" || game.status === "lost";
  const waitingHost = !isHost && hostAway;
  const mistake = game.lastMistake;
  const seats: Seat[] = Object.entries(game.hands).map(([id, hand]) => ({
    id,
    name: nameOf(id),
    avatar: people[id]?.avatar ?? "🐺",
    cards: hand.length,
    self: id === playerId.current,
  }));
  return (
    <Shell>
      <main className={roomPageClass}>
        <GameHeader title="Ordem silenciosa" room={{ pin: room, players: roster }} leave={leaveConfig} />
        <section className="mx-auto my-[25px] mb-[60px] flex w-full max-w-[640px] flex-col items-center gap-6">
          <div className="flex w-full items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <span className="text-sm text-[#c9c4dd]">Nível</span>
              <LedSign className="w-full text-center">
                {game.level}/{game.maxLevel}
              </LedSign>
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <span className="text-sm text-[#c9c4dd]">Vidas</span>
              <div className="flex h-[52px] items-center gap-1" aria-label={`${game.lives} de ${STARTING_LIVES} vidas`}>
                {Array.from({ length: STARTING_LIVES }, (_, index) => (
                  <GameIcon key={index} id="vida" size={36} className={index < game.lives ? "" : "opacity-20 grayscale"} />
                ))}
              </div>
            </div>
          </div>

          <CardTable seats={seats} pile={game.pile}>
            <AnimatePresence>
              {replay && <MistakeReplay key={replay.id} entries={replay.entries} people={personOf} onClose={closeReplay} />}
            </AnimatePresence>
          </CardTable>
          <p className="sr-only" aria-live="polite">
            {lastPlayed && `${nameOf(lastPlayed.by)} jogou ${lastPlayed.card}.`}
            {mistake &&
              lastPlayed?.card === mistake.card &&
              ` Fora de ordem: ${Object.entries(mistake.discarded)
                .map(([id, cards]) => `${nameOf(id)} tinha ${cards.join(", ")}`)
                .join(" e ")}. O grupo perdeu uma vida.`}
          </p>

          {waitingHost && (
            <p role="status" className="w-full rounded-md border border-[#fdcb6e] bg-[#2a220f] p-3 text-center text-sm text-[#ffe9a8]">
              O anfitrião saiu da sala. As jogadas voltam quando ele reconectar.
            </p>
          )}

          {game.status === "playing" && (
            <div className="flex w-full flex-col items-center gap-3">
              <span className="text-xs tracking-[.12em] text-[#9b97b2] uppercase">
                {myHand.length > 0 ? "Sua mão · toque na carta mais baixa para jogar" : "Sua mão"}
              </span>
              {myHand.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {myHand.map((card, index) =>
                    index === 0 ? (
                      <motion.button
                        key={card}
                        type="button"
                        onClick={playCard}
                        aria-label={`Jogar a carta ${card}`}
                        whileHover={{ y: -6 }}
                        whileTap={{ scale: 0.92 }}
                        className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#00e5ff] ">
                        <PlayingCard value={card} size="lg" className="shadow-[0_0_0_2px_#00e5ff,0_0_18px_#00e5ff99]" />
                      </motion.button>
                    ) : (
                      <PlayingCard key={card} value={card} size="lg" className="opacity-60" />
                    ),
                  )}
                </div>
              ) : (
                <p className={roomDescriptionClass}>
                  {game.hands[playerId.current]
                    ? "Suas cartas acabaram. Aguarde os outros."
                    : "Você entrou no meio: acompanhe até o próximo nível."}
                </p>
              )}
            </div>
          )}

          {game.status === "level-done" && (
            <div className="flex flex-col items-center gap-3 text-center">
              <h2 className="font-heading text-[28px] font-bold text-[#7dffb0]">Nível {game.level} concluído!</h2>
              {isHost ? (
                <GameActions>
                  <GameButton variant="game" onClick={() => publish(nextLevel(game, playerIds))}>
                    <SkipForward /> Nível {game.level + 1}
                  </GameButton>
                </GameActions>
              ) : (
                <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar o próximo nível.</p>
              )}
            </div>
          )}

          {over && (
            <div className="flex flex-col items-center gap-3 text-center">
              <Badge variant="outline">FIM DE JOGO</Badge>
              <h2 className="font-heading text-[28px] font-bold">
                {game.status === "won" ? "A alcateia venceu!" : `Chegaram ao nível ${game.level}`}
              </h2>
              <p className={roomDescriptionClass}>
                {game.status === "won"
                  ? `Todos os ${game.maxLevel} níveis em ordem e em silêncio.`
                  : "As vidas acabaram. Tentem de novo, no ritmo da alcateia."}
              </p>
              {isHost && (
                <GameActions>
                  <GameButton variant="game" onClick={() => publish(null)}>
                    <RotateCcw /> Jogar novamente
                  </GameButton>
                </GameActions>
              )}
            </div>
          )}
        </section>
      </main>
    </Shell>
  );
}
