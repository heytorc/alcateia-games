import { useEffect, useRef, useState } from "react";
import { GameIcon } from "@/components/games/GameIcon";

import { Flag, RotateCcw, Plus, LogIn, Play } from "lucide-react";

import { useNavigate } from "react-router-dom";

import { GameActions, GameHeader, Shell } from "@/components";

import { Badge } from "@/components/ui/badge";


import { Card, CardContent } from "@/components/ui/card";

import { wordBank } from "@/constants/impostor-words";

import { RoomDirectory } from "@/components/games/RoomDirectory";

import { supabase } from "@/lib/realtime";

import { useGameStore } from "@/lib/store";

import { createClientId, createRoomPin } from "@/lib/utils";
import { JoinRoomDialog } from "@/components/games/JoinRoomDialog";
import { roomDescriptionClass, roomHeadingClass, roomPageClass } from "@/components/games/room-styles";
import { isHostRoom, setHostRoom, useRestoreRoom } from "@/hooks/useRestoreRoom";
import { ErrorPage } from "@/components/ErrorPage";
import { useOnline } from "@/hooks/useOnline";
import { GameButton } from "@/components/games/GameButton";
import type { PlayerListItem } from "@/components/games/PlayerList";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { WolfFieldLobby } from "@/components/games/WolfFieldLobby";

/** `votedId` nulo remove o voto de `voterId`. */
function applyVote(votes: Record<string, string>, voterId: string, votedId: string | null) {
  const { [voterId]: _, ...rest } = votes;
  return votedId === null ? rest : { ...rest, [voterId]: votedId };
}

export function ImpostorGame() {
  const configured = Boolean(supabase);
  const online = useOnline();
  const navigate = useNavigate();
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<Array<{ id: string; name: string; avatar: string }>>([]);
  const [isImpostor, setIsImpostor] = useState(false);
  const [secretWord, setSecretWord] = useState("");
  const [gamePhase, setGamePhase] = useState<"LOBBY" | "PLAYING" | "RESULTS">("LOBBY");
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [impostorId, setImpostorId] = useState("");
  const [roomClosed, setRoomClosed] = useState(false);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const playerId = useRef(createClientId());
  const roster: PlayerListItem[] = players.map((player) => ({
    ...player,
    tag: player.id === playerId.current ? (isHost ? "HOST" : "VOCÊ") : undefined,
  }));
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>["channel"]> | null>(null);
  const usedWords = useRef<string[]>([]);
  const { profile, setLastRoom } = useGameStore();

  useRestoreRoom("impostor", (restoredPin) => {
    setRoom(restoredPin);
    setJoined(true);
    setIsHost(isHostRoom("impostor", restoredPin));
  });

  useEffect(() => {
    const client = supabase;
    if (!joined || !client || !room) return;
    const channel = client.channel(`impostor:${room}`, { config: { presence: { key: playerId.current } } });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ name: string; avatar: string }>();
        setPlayers(
          Object.entries(state).map(([id, entries]) => ({
            id,
            name: entries[0]?.name ?? "Desconhecido",
            avatar: entries[0]?.avatar ?? "🐺",
          })),
        );
      })
      .on("broadcast", { event: "round-start" }, ({ payload }) => {
        setGamePhase("PLAYING");
        setIsImpostor(payload.impostorId === playerId.current);
        setSecretWord(payload.word);
        setImpostorId(payload.impostorId);
        setVotes({});
      })
      .on("broadcast", { event: "vote" }, ({ payload }) => {
        setVotes((prev) => applyVote(prev, payload.voterId, payload.votedId));
      })
      .on("broadcast", { event: "end-round" }, () => {
        setGamePhase("RESULTS");
      })
      .on("broadcast", { event: "room-closed" }, () => {
        setJoined(false);
        setGamePhase("LOBBY");
        setRoomClosed(true);
        setLastRoom(null, null);
        void client.removeChannel(channel);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ name: profile.name.trim(), avatar: profile.avatar, pin: room });
          setLastRoom(room, "impostor");
        }
      });
    channelRef.current = channel;
    return () => {
      void client.removeChannel(channel);
    };
  }, [joined, profile.avatar, profile.name, room]);
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
    setHostRoom("impostor", newPin, true);
    setJoined(true);
    navigate(`?pin=${newPin}`);
  };
  const start = async () => {
    const channel = channelRef.current;
    if (!channel) return;
    const state = channel.presenceState<{ name: string }>();
    const ids = Object.keys(state);
    const impostorId = ids[Math.floor(Math.random() * ids.length)] ?? playerId.current;

    let word;
    do {
      word = wordBank[Math.floor(Math.random() * wordBank.length)];
    } while (usedWords.current.includes(word) && usedWords.current.length < wordBank.length);
    usedWords.current.push(word);

    setGamePhase("PLAYING");
    setIsImpostor(impostorId === playerId.current);
    setSecretWord(word);
    setImpostorId(impostorId);
    setVotes({});
    await channel.send({ type: "broadcast", event: "round-start", payload: { impostorId, word } });
  };
  const castVote = async (votedId: string | null) => {
    const channel = channelRef.current;
    if (!channel) return;

    setVotes((prev) => applyVote(prev, playerId.current, votedId));

    await channel.send({
      type: "broadcast",
      event: "vote",
      payload: { voterId: playerId.current, votedId },
    });
  };
  const endRound = async () => {
    const channel = channelRef.current;
    if (!channel) return;
    await channel.send({ type: "broadcast", event: "end-round", payload: {} });
    setGamePhase("RESULTS");
  };
  const closeRoom = async () => {
    const channel = channelRef.current;
    if (channel) await channel.send({ type: "broadcast", event: "room-closed", payload: {} });
    if (channel && supabase) await supabase.removeChannel(channel);
    setHostRoom("impostor", room, false);
    setJoined(false);
    setGamePhase("LOBBY");
    navigate({ search: "" }, { replace: true });
    setLastRoom(null, null);
    usedWords.current = [];
  };

  const leaveRoom = async () => {
    const channel = channelRef.current;
    if (channel && supabase) await supabase.removeChannel(channel);
    setJoined(false);
    setLastRoom(null, null);
    navigate({ search: "" }, { replace: true });
  };
  const joinListedRoom = (listedRoom: string) => {
    if (!profile.name.trim()) return;
    setRoom(listedRoom);
    setIsHost(false);
    setJoined(true);
  };

  const setupCardClass =
    "mx-auto my-[60px] flex max-w-[600px] flex-col items-center rounded-[6px] py-9 px-7 text-center";
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
      <main
        className={`${!joined ? "w-full px-5 md:px-10" : roomPageClass} ${gamePhase === "PLAYING" && isImpostor ? "bg-[radial-gradient(circle_at_50%_40%,rgba(214,48,49,0.25),transparent_35rem)]" : ""}`}>
        <GameHeader
          title="Impostor"
          actions={
            !joined &&
            !isDesktop && (
              <RoomDirectory
                variant="drawer"
                game="impostor"
                isHosting={false}
                hostName=""
                hostAvatar=""
                pin=""
                disabled={!profile.name.trim()}
                onJoin={joinListedRoom}
              />
            )
          }
          room={joined ? { pin: room, players: roster } : undefined}
          leave={joined ? { host: isHost, onConfirm: isHost ? closeRoom : leaveRoom } : undefined}
        />
        {!joined ? (
          <>
            <section className="grid w-full items-start gap-8 py-10 md:grid-cols-2 md:gap-12 md:py-16">
              <div className="flex flex-col items-center gap-5 text-center md:items-start md:text-left">
                <GameIcon id="impostor" size={57} />
                <h2 className={roomHeadingClass}>Entre numa sala</h2>
                <p className={roomDescriptionClass}>Crie uma alcateia, convide os amigos e descubra quem está blefando.</p>
              {!profile.name && (
                <p className="text-sm text-[#ffd0d0]">
                  Defina seu nome pelo perfil na barra superior antes de entrar em uma sala.
                </p>
              )}
                <GameActions className="md:mx-0 md:justify-start">
                <GameButton variant="game" onClick={createRoom}>
                  <Plus /> Criar sala
                </GameButton>
                <GameButton variant="info" onClick={() => setIsJoinDialogOpen(true)}>
                  <LogIn /> Entrar na sala
                </GameButton>
              </GameActions>
              </div>
              {isDesktop && (
                <RoomDirectory
                  game="impostor"
                  isHosting={false}
                  hostName=""
                  hostAvatar=""
                  pin=""
                  disabled={!profile.name.trim()}
                  onJoin={joinListedRoom}
                />
              )}
            </section>
            <JoinRoomDialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen} pin={room} onPinChange={setRoom} onConfirm={join} />
          </>
        ) : gamePhase === "LOBBY" ? (
          <div className="my-10 flex w-full flex-col items-center gap-6 text-center">
              <h2 className={roomHeadingClass}>Lobby da alcateia</h2>
              <WolfFieldLobby players={roster} />
              {isHost ? (
                <GameActions>
                  <GameButton variant="game" onClick={start}>
                    <Play /> Começar rodada
                  </GameButton>
                </GameActions>
              ) : (
                <p className={roomDescriptionClass}>Aguarde o anfitrião iniciar a rodada.</p>
              )}
              <RoomDirectory
                game="impostor"
                isHosting={isHost}
                showList={false}
                hostName={profile.name}
                hostAvatar={profile.avatar}
                pin={room}
                onJoin={() => undefined}
              />
            </div>
        ) : gamePhase === "PLAYING" ? (
          <Card
            className={`${setupCardClass.replace("max-w-[600px]", "max-w-[760px]")} ${isImpostor ? "overflow-hidden border-2 border-[#ff4552] bg-[#1a0b1c] bg-[repeating-linear-gradient(135deg,rgba(255,69,82,0.10)_0_14px,transparent_14px_28px)] shadow-[0_0_20px_rgba(255,69,82,0.5)]" : ""}`}>
            <CardContent className="flex w-full flex-col items-center gap-5">
              {isImpostor && (
                <span className="rounded-sm border border-[#ff4552] bg-[#ff4552]/15 px-3 py-1 font-game-pixel text-[10px] uppercase tracking-[.2em] text-[#ff8a93]">
                  Papel secreto · Impostor
                </span>
              )}
              {isImpostor ? (
                <div className="rounded-full border-2 border-[#ff4552] bg-[#12040a] p-3 shadow-[0_0_16px_#ff4552]">
                  <GameIcon id="impostor" size={72} />
                </div>
              ) : (
                <GameIcon id="ovelha" size={96} />
              )}
              <h2 className={`${roomHeadingClass} ${isImpostor ? "font-game-pixel text-[26px] uppercase tracking-[.08em] !text-[#ff4552]" : ""}`}>
                {isImpostor ? "Você é o impostor!" : "Você não é o impostor"}
              </h2>
              <p className={`${roomDescriptionClass} ${isImpostor ? "text-[#f1c7cc]" : ""}`}>
                {isImpostor
                  ? "Finja que sabe a palavra e não deixe ninguém desconfiar."
                  : "A palavra secreta foi revelada para você. Boa sorte!"}
              </p>
              <div
                className={`mb-[25px] rounded-md px-7 py-4 font-heading text-[30px] font-bold tracking-wide text-brand-gold ${isImpostor ? "w-full max-w-[280px] rounded-sm bg-[#ffe14a] !text-[#12040a] shadow-[6px_6px_0_#ff4552]" : "bg-panel-dark"}`}>
                {isImpostor ? "???" : secretWord}
              </div>

              <div className={`mb-5 w-full text-center ${isImpostor ? "rounded-md bg-[#12040a]/80 px-3 py-4 ring-1 ring-[#a78bfa]/40" : ""}`}>
                <p className="mb-3 text-sm text-[#c2b9d1]">Vote em quem você acha que é o impostor:</p>
                <div className="flex flex-wrap justify-center gap-2 p-4">
                  {players
                    .filter((p) => p.id !== playerId.current)
                    .map((player) => {
                      const voteCount = Object.values(votes).filter((votedId) => votedId === player.id).length;
                      return (
                      <GameButton
                        key={player.id}
                        variant={votes[playerId.current] === player.id ? "success" : "special"}
                        onClick={() => castVote(votes[playerId.current] === player.id ? null : player.id)}
                        disabled={votes[playerId.current] !== undefined && votes[playerId.current] !== player.id}
                        className="relative min-w-[120px] overflow-visible">
                        {player.avatar} {player.name}
                        {voteCount > 0 && (
                          <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-md border-2 border-black bg-accent px-1 font-game-pixel text-[10px] leading-4 text-accent-foreground">
                            {voteCount}
                            <span className="sr-only"> {voteCount === 1 ? "voto" : "votos"}</span>
                          </span>
                        )}
                      </GameButton>
                      );
                    })}
                </div>
                <p className="mt-3 text-xs font-medium text-[#a29bfe]">
                  {Object.keys(votes).length}/{players.length} participantes votaram
                </p>
              </div>

              {isHost && (
                <GameActions>
                  <GameButton variant="game" onClick={endRound} className="sm:order-2">
                    <Flag /> Encerrar rodada
                  </GameButton>
                  <GameButton variant="info" onClick={start} className="sm:order-1">
                    <RotateCcw /> Nova rodada
                  </GameButton>
                </GameActions>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className={setupCardClass}>
            <CardContent className="flex w-full flex-col items-center gap-5">
              <GameIcon id="votos" size={72} />
              <h2 className={roomHeadingClass}>Resultado da Rodada</h2>

              <div className="flex w-full flex-col items-center gap-3 my-4">
                {players.map((player) => {
                  const voteCount = Object.values(votes).filter((votedId) => votedId === player.id).length;
                  const isActualImpostor = player.id === impostorId;

                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between w-full max-w-[400px] p-3 rounded-md bg-[#150d33] border-2 border-[#4a34a8]">
                      <div className="flex items-center gap-3">
                        <span>{player.avatar}</span>
                        <span className="font-medium text-white">{player.name}</span>
                        {isActualImpostor && <Badge className="bg-danger-base text-white">O Impostor!</Badge>}
                      </div>
                      <div className="text-brand-gold font-bold">{voteCount} votos</div>
                    </div>
                  );
                })}
              </div>

              {isHost && (
                <GameActions>
                  <GameButton variant="game" onClick={start}>
                    <RotateCcw /> Nova rodada
                  </GameButton>
                </GameActions>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </Shell>
  );
}
