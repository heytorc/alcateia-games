import { useEffect, useRef, useState } from "react";
import { GameIcon } from "@/components/games/GameIcon";
import { RotateCcw, X, Plus, LogIn, LogOut, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GameActions, GameDialogFooter, GameHeader, Shell, Switch } from "@/components";
import { RoomDirectory } from "@/components/games/RoomDirectory";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/realtime";
import { useGameStore } from "@/lib/store";
import { playDigSound, playExplosionSound, playTickSound } from "@/lib/audio";
import { createClientId, createRoomPin } from "@/lib/utils";
import { BottomSheet } from "@/components/BottomSheet";
import { IconCounter } from "@/components/IconCounter";
import { NeonSlider } from "@/components/NeonSlider";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { useRestoreRoom } from "@/hooks/useRestoreRoom";
import { ErrorPage } from "@/components/ErrorPage";
import { useOnline } from "@/hooks/useOnline";
import { GameButton } from "@/components/games/GameButton";
import { OrientationGuide } from "@/components/games/OrientationGuide";
import { PlayerLivesBar } from "@/components/games/PlayerLivesBar";
import { CampoMinadoGrid } from "@/components/games/CampoMinadoGrid";
import { applyClick, createMatch, currentPlayerId, forfeit, type Match } from "@/lib/campo-minado-rules";
import { motion } from "motion/react";
import type { PlayerListItem } from "@/components/games/PlayerList";

interface PlayerState {
  id: string;
  name: string;
  avatar: string;
  ready: boolean;
  /** Bombas posicionadas no lobby; valem quando `ready`. */
  bombs: number[];
}

export function CampoMinadoGame() {
  const configured = Boolean(supabase);
  const online = useOnline();
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [roomClosed, setRoomClosed] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [orientationDismissed, setOrientationDismissed] = useState(false);

  // Game Config
  const [gridSize, setGridSize] = useState({ rows: 5, cols: 5 });
  const [maxLives, setMaxLives] = useState(3);
  const [bombsPerPlayer, setBombsPerPlayer] = useState(3);
  const [showMyBombs, setShowMyBombs] = useState(true);

  const playerId = useRef(createClientId());

  // Gameplay State
  const [myBombs, setMyBombs] = useState<number[]>([]);
  const [match, setMatch] = useState<Match | null>(null);
  const [settledRound, setSettledRound] = useState(0);

  const gamePhase = !match ? "LOBBY" : match.result ? "RESULTS" : "PLAYING";
  const shuffling = Boolean(match && !match.result && match.round !== settledRound);
  const activeId = match && !shuffling ? currentPlayerId(match) : null;
  const isMyTurn = activeId === playerId.current;
  const matchRef = useRef<Match | null>(null);
  matchRef.current = match;
  // Lido pelos handlers do canal, que não são recriados a cada mudança de configuração.
  const sharedRef = useRef({ isHost, config: { gridSize, maxLives, bombsPerPlayer, showMyBombs } });
  sharedRef.current = { isHost, config: { gridSize, maxLives, bombsPerPlayer, showMyBombs } };

  const roster: PlayerListItem[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    tag: p.id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
    status: gamePhase === "LOBBY" ? (p.ready ? <>PRONTO <GameIcon id="ok" size={14} className="inline-block align-middle" /></> : "AGUARDA…") : p.id === activeId ? "VEZ" : undefined,
    active: p.id === activeId,
  }));
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const { profile, soundEnabled, setLastRoom } = useGameStore();

  const applyConfig = (config: typeof sharedRef.current.config) => {
    setGridSize(config.gridSize);
    setMaxLives(config.maxLives);
    setBombsPerPlayer(config.bombsPerPlayer);
    setShowMyBombs(config.showMyBombs);
  };

  const clearMatch = () => {
    setMatch(null);
    setSettledRound(0);
    setMyBombs([]);
  };

  useRestoreRoom("campo-minado", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    if (localStorage.getItem(`host_room_${restoredPin}`) === "true") setIsHost(true);
  });

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;

    const channel = client.channel(`campo-minado:${room}`, { config: { presence: { key: playerId.current } } });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PlayerState>();
        setPlayers(
          Object.entries(state).map(([id, entries]) => ({
            id,
            name: entries[0]?.name ?? "Desconhecido",
            avatar: entries[0]?.avatar ?? "🐺",
            ready: entries[0]?.ready ?? false,
            bombs: entries[0]?.bombs ?? [],
          })),
        );
      })
      .on("presence", { event: "join" }, () => {
        // Quem entra depois não recebeu o último update_config: o anfitrião reenvia.
        if (sharedRef.current.isHost) {
          void channel.send({ type: "broadcast", event: "update_config", payload: sharedRef.current.config });
        }
      })
      .on("broadcast", { event: "start_game" }, ({ payload }) => {
        applyConfig(payload.config);
        setSettledRound(0);
        setMatch(createMatch(payload.seed, payload.totalCells, payload.maxLives, payload.bombMap, payload.playerIds));
      })
      .on("broadcast", { event: "cell_click" }, ({ payload }) => {
        const { cellIndex, playerId: clickedPlayerId } = payload;
        const current = matchRef.current;
        const next = current && applyClick(current, cellIndex, clickedPlayerId);
        if (!current || next === current) return;

        setMatch((prev) => prev && applyClick(prev, cellIndex, clickedPlayerId));
        const sound = useGameStore.getState().soundEnabled;
        if (current.bombMap[cellIndex]) playExplosionSound(sound);
        else playDigSound(sound);
      })
      .on("broadcast", { event: "forfeit" }, ({ payload }) => {
        setMatch((prev) => prev && forfeit(prev, payload.playerId));
      })
      .on("broadcast", { event: "update_config" }, ({ payload }) => applyConfig(payload))
      .on("broadcast", { event: "reset_game" }, () => {
        clearMatch();
        channelRef.current?.track({
            name: profile.name.trim(),
            avatar: profile.avatar,
            ready: false,
        }).catch(() => {});
      })
      .on("broadcast", { event: "room-closed" }, () => {
        setJoined(false);
        clearMatch();
        setRoomClosed(true);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            name: profile.name.trim(),
            avatar: profile.avatar,
            ready: false,
          });
          setLastRoom(room, "campo-minado");
        }
      });

    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room]);

  // Quem sai da sala na vez dele travaria a partida: o anfitrião o elimina após uma folga.
  const turnPlayerId = match ? currentPlayerId(match) : null;
  const turnPlayerPresent = players.some((p) => p.id === turnPlayerId);
  useEffect(() => {
    if (!isHost || !turnPlayerId || turnPlayerPresent) return;
    const timer = setTimeout(() => {
      setMatch((prev) => prev && forfeit(prev, turnPlayerId));
      void channelRef.current?.send({ type: "broadcast", event: "forfeit", payload: { playerId: turnPlayerId } });
    }, 3000);
    return () => clearTimeout(timer);
  }, [isHost, turnPlayerId, turnPlayerPresent]);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const joinListedRoom = (listedRoom: string) => {
    setRoom(listedRoom);
    setJoined(true);
    navigate(`?pin=${listedRoom}`);
  };

  const join = () => {
    if (!profile.name.trim() || !room.trim()) return;
    setIsHost(false);
    setJoined(true);
    navigate(`?pin=${room}`);
  };

  const createRoom = () => {
    if (!profile.name.trim()) return;
    const newPin = createRoomPin();
    setRoom(newPin);
    setIsHost(true);
    setJoined(true);
    localStorage.setItem(`host_room_${newPin}`, 'true');
    clearMatch();

    navigate(`?pin=${newPin}`);
  };

  const toggleReady = async () => {
    const channel = channelRef.current;
    if (!channel) return;

    const currentReady = players.find(p => p.id === playerId.current)?.ready ?? false;
    await channel.track({
        name: profile.name.trim(),
        avatar: profile.avatar,
        ready: !currentReady,
        bombs: myBombs,
    });
  };

  const updateSettings = async () => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "update_config",
      payload: sharedRef.current.config
    });
  };

  const handleBombPlacement = (index: number) => {
    if (players.find(p => p.id === playerId.current)?.ready) return;
    if (!myBombs.includes(index) && myBombs.length < bombsPerPlayer) playTickSound(soundEnabled);
    setMyBombs((prev) => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      if (prev.length >= bombsPerPlayer) return prev;
      return [...prev, index];
    });
  };

  const start = async () => {
    const channel = channelRef.current;
    if (!channel) return;

    const totalCells = gridSize.rows * gridSize.cols;
    const bombMap: Record<number, string[]> = {};
    players.forEach(p => {
        p.bombs.filter(idx => idx >= 0 && idx < totalCells).forEach(idx => {
            bombMap[idx] = [...(bombMap[idx] ?? []), p.id];
        });
    });

    const payload = {
      bombMap,
      config: sharedRef.current.config,
      totalCells,
      maxLives,
      seed: Math.floor(Math.random() * 2 ** 31),
      playerIds: players.map(p => p.id),
    };
    setSettledRound(0);
    setMatch(createMatch(payload.seed, totalCells, maxLives, bombMap, payload.playerIds));
    await channel.send({ type: "broadcast", event: "start_game", payload });
  };

  const onCellClick = async (index: number) => {
    const channel = channelRef.current;
    if (!match || !channel || !isMyTurn) return;

    const next = applyClick(match, index, playerId.current);
    if (next === match) return;

    setMatch(next);
    if (match.bombMap[index]) playExplosionSound(soundEnabled);
    else playDigSound(soundEnabled);
    await channel.send({
      type: "broadcast",
      event: "cell_click",
      payload: { cellIndex: index, playerId: playerId.current }
    });
  };

  const resetGame = async () => {
    const channel = channelRef.current;
    if (!channel) return;

    clearMatch();
    await channel.send({
      type: "broadcast",
      event: "reset_game",
      payload: {}
    });

    await channel.track({
        name: profile.name.trim(),
        avatar: profile.avatar,
        ready: false,
    });
  };

  const leaveRoom = async () => {
    const channel = channelRef.current;
    if (channel && supabase) await supabase.removeChannel(channel);
    localStorage.removeItem(`host_room_${room}`);

    setJoined(false);
    setLastRoom(null, null);
    clearMatch();
    navigate("/");
  };

  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    localStorage.removeItem(`host_room_${room}`);

    setJoined(false);
    setRoomClosed(true);
    setLastRoom(null, null);
    clearMatch();
  };

  const gamePlayers = players
    .filter((p) => match && p.id in match.lives)
    .map((p) => ({ ...p, lives: match!.lives[p.id], maxLives: match!.maxLives }));
  const winners = match?.result ? gamePlayers.filter((p) => match.result!.winnerIds.includes(p.id)) : [];
  const turnLabel = shuffling
    ? "Sorteando a ordem…"
    : isMyTurn
      ? "SUA VEZ!"
      : `Vez de ${players.find((p) => p.id === activeId)?.name ?? "…"}`;

  const setupCardClass = "mx-auto my-[60px] flex max-w-[800px] flex-col items-center rounded-[6px] py-9 px-7 text-center";

  if (!online && !joined) return <ErrorPage kind="offline" />;
  if (!configured) return <ErrorPage kind="multiplayer" />;
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
  return (
    <Shell>
      <main className={!joined ? "w-full px-5 md:px-10" : roomPageClass}>
        <GameHeader
          title="Campo Minado"
          actions={
            !joined &&
            !isDesktop && (
              <RoomDirectory
                variant="drawer"
                game="campo-minado"
                isHosting={false}
                hostName=""
                hostAvatar=""
                pin=""
                onJoin={joinListedRoom}
              />
            )
          }
          onSettings={joined && isHost ? () => setIsSettingsDialogOpen(true) : undefined}
          room={joined ? { pin: room, players: roster } : undefined}
        />
        {!joined ? (
          <>
            <section className="grid w-full items-start gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-16">
              <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
                <GameIcon id="campo-minado" size={57} />
                <h2 className={roomHeadingClass}>Entre numa sala</h2>
                <p className={roomDescriptionClass}>Crie uma alcateia e tente sobreviver ao campo minado.</p>
                <GameActions className="md:mx-0 md:justify-start">
                <GameButton variant="game" onClick={createRoom}><Plus /> Criar sala</GameButton>
                <GameButton variant="info" onClick={() => setIsJoinDialogOpen(true)}><LogIn /> Entrar na sala</GameButton>
              </GameActions>
              </div>
              {isDesktop && (
                <RoomDirectory
                  game="campo-minado"
                  isHosting={false}
                  hostName=""
                  hostAvatar=""
                  pin=""
                  onJoin={joinListedRoom}
                />
              )}
            </section>
            <JoinRoomDialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen} pin={room} onPinChange={setRoom} onConfirm={join} />
          </>
        ) : gamePhase === "LOBBY" ? (
          <div className="flex w-full flex-col items-center gap-5 py-8 text-center">
              <h2 className={roomHeadingClass}>Lobby de Bombas</h2>
              <p className={roomDescriptionClass}>Distribua suas {bombsPerPlayer} bombas no campo e clique em Pronto.</p>

              <div className="flex gap-2 mb-4 justify-center">
                {Array.from({ length: bombsPerPlayer }).map((_, i) => (
                  <motion.span
                    key={i}
                    animate={{
                      scale: i < (bombsPerPlayer - myBombs.length) ? 1 : 0.7,
                      filter: i < (bombsPerPlayer - myBombs.length) ? 'grayscale(0%)' : 'grayscale(100%)',
                      opacity: i < (bombsPerPlayer - myBombs.length) ? 1 : 0.5,
                    }}
                    className="inline-flex"
                  >
                    <GameIcon id="campo-minado" size={32} />
                  </motion.span>
                ))}
              </div>

              <div className="w-full overflow-x-auto p-1">
                <CampoMinadoGrid
                  key={`${gridSize.rows}x${gridSize.cols}`}
                  rows={gridSize.rows}
                  cols={gridSize.cols}
                  phase="LOBBY"
                  cellStatuses={{}}
                  myBombs={myBombs}
                  onCellClick={handleBombPlacement}
                />
              </div>

              <GameActions className="mt-6">
                {isHost && (
                  <GameButton variant="game" onClick={start} disabled={!players.every(p => p.ready)}>
                    <Play /> Começar jogo
                  </GameButton>
                )}
                <GameButton variant={players.find(p => p.id === playerId.current)?.ready ? "success" : "info"} onClick={toggleReady} disabled={!players.find(p => p.id === playerId.current)?.ready && myBombs.length < bombsPerPlayer}>
                  {players.find(p => p.id === playerId.current)?.ready ? "Pronto!" : "Marcar como pronto"}
                </GameButton>
                <GameButton variant="special" onClick={leaveRoom}><LogOut /> Sair da sala</GameButton>
              </GameActions>
          </div>
        ) : gamePhase === "PLAYING" && match ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <h2 className="neon-text font-game-pixel text-2xl tracking-[.08em]">RODADA {match.round}</h2>
            <p className={`font-game-pixel text-sm tracking-[.08em] ${isMyTurn ? "neon-text" : "text-[#c2b9d1]"}`} aria-live="polite">
              {turnLabel}
            </p>
            <OrientationGuide
              isVisible={!orientationDismissed && gridSize.cols > 8 && window.innerWidth < 768}
              onDismiss={() => setOrientationDismissed(true)}
            />
            <PlayerLivesBar
              players={gamePlayers}
              order={match.order}
              activeId={activeId}
              shuffling={shuffling}
              onShuffleDone={() => setSettledRound(match.round)}
            />
            <div className="w-full overflow-x-auto p-1">
              <CampoMinadoGrid
                key={`${gridSize.rows}x${gridSize.cols}`}
                rows={gridSize.rows}
                cols={gridSize.cols}
                phase="PLAYING"
                cellStatuses={match.statuses}
                onCellClick={onCellClick}
                showMyBombs={showMyBombs}
                myBombs={myBombs}
                disabled={!isMyTurn}
              />
            </div>
            {isHost && (
              <GameActions className="mt-6">
                <GameButton variant="danger" onClick={closeRoom}><X /> Encerrar sala</GameButton>
              </GameActions>
            )}
          </div>
        ) : (
          <Card className={setupCardClass}>
            <CardContent className="flex w-full flex-col items-center gap-5">
              <GameIcon id="trofeu" size={72} />
              <h2 className={roomHeadingClass}>Fim de Jogo</h2>
              <p className={roomDescriptionClass}>
                {winners.length === 1
                  ? `${winners[0].avatar} ${winners[0].name} é o sobrevivente!`
                  : winners.length > 1
                    ? "Empate! Os sobreviventes terminaram com as mesmas vidas."
                    : "Ninguém sobreviveu."}
              </p>
              <div className="flex flex-col gap-2 w-full max-w-[300px]">
                {[...gamePlayers].sort((a, b) => b.lives - a.lives).map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-md bg-[#150d33] border-2 border-[#4a34a8]">
                    <span className="text-white">{i+1}º {p.avatar} {p.name}</span>
                    <span className="text-brand-gold font-bold">{p.lives} <GameIcon id="vida" size={16} className="inline-block align-middle" /></span>
                  </div>
                ))}
              </div>
              <GameActions>
                {isHost ? (
                  <>
                    <GameButton variant="game" onClick={resetGame}><RotateCcw /> Jogar novamente</GameButton>
                    <GameButton variant="danger" onClick={closeRoom}><X /> Encerrar sala</GameButton>
                  </>
                ) : (
                  <GameButton variant="special" onClick={leaveRoom}><LogOut /> Sair da sala</GameButton>
                )}
              </GameActions>
            </CardContent>
          </Card>
        )}
      </main>
      <BottomSheet
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        title="Configurações da sala"
        description="Ajuste as regras do campo minado para todos os jogadores."
        footer={
          <GameDialogFooter>
            <GameButton variant="special" onClick={() => setIsSettingsDialogOpen(false)}>Cancelar</GameButton>
            <GameButton variant="game" onClick={() => { updateSettings(); setIsSettingsDialogOpen(false); }}>Salvar alterações</GameButton>
          </GameDialogFooter>
        }>
        <div className="flex flex-col gap-6 py-2">
          <NeonSlider label="Linhas" value={gridSize.rows} min={1} max={20} onChange={(rows) => setGridSize((p) => ({ ...p, rows }))} />
          <NeonSlider label="Colunas" value={gridSize.cols} min={1} max={20} onChange={(cols) => setGridSize((p) => ({ ...p, cols }))} />
          <IconCounter label="Vidas" value={maxLives} min={1} max={10} onChange={setMaxLives} icon={<GameIcon id="vida" size={32} />} />
          <IconCounter label="Bombas" value={bombsPerPlayer} min={1} max={10} onChange={setBombsPerPlayer} icon={<GameIcon id="campo-minado" size={32} />} />
          <div className="flex items-center justify-between gap-4 border-t border-white/9 pt-4">
            <span id="show-my-bombs" className="text-base text-[#c2b9d1]">Exibir minhas bombas no campo</span>
            <Switch checked={showMyBombs} onChange={setShowMyBombs} />
          </div>
        </div>
      </BottomSheet>
    </Shell>

  );
}
