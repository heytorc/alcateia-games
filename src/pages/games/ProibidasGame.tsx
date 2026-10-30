import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Ban, Play, Plus, RotateCcw, SkipForward, Trophy, Users, X } from "lucide-react";
import { celebrate, GameActions, NumberStepper } from "@/components";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { GameButton } from "@/components/games/GameButton";
import { GameIcon } from "@/components/games/GameIcon";
import { GameLayout } from "@/components/games/GameLayout";
import { LedSign } from "@/components/games/LedSign";
import { roomDescriptionClass, roomHeadingClass } from "@/components/games/room-styles";
import { tabooCards as bundledCards, type TabooCard } from "@/constants/taboo-cards";
import { useTabooCards } from "@/hooks/useWords";
import { playSuccessHorn, playTickSound, playTimerEndSound } from "@/lib/audio";
import { drawCards, participantError, standings } from "@/lib/proibidas-rules";
import { useGameStore } from "@/lib/store";

type Mode = "timed" | "free";
type Phase = "setup" | "play" | "podium";

const clamp = (value: string, min: number, max: number, fallback: number) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};

export function ProibidasGame() {
  const { soundEnabled } = useGameStore();
  const cards = useTabooCards(bundledCards);
  const [phase, setPhase] = useState<Phase>("setup");
  const [participants, setParticipants] = useState<string[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [wordCountInput, setWordCountInput] = useState("10");
  const [secondsInput, setSecondsInput] = useState("60");
  const [mode, setMode] = useState<Mode>("timed");
  const [deck, setDeck] = useState<TabooCard[]>([]);
  const [index, setIndex] = useState(0);
  const [hits, setHits] = useState<Record<string, number>>({});
  const [remainingMs, setRemainingMs] = useState(0);
  const [resetOpen, setResetOpen] = useState(false);
  /** Cartas já sorteadas nesta sessão: a próxima partida evita repetir. */
  const usedWords = useRef<string[]>([]);
  const deadline = useRef(0);
  const lastTick = useRef(0);

  const wordCount = clamp(wordCountInput, 3, 50, 10);
  const seconds = clamp(secondsInput, 15, 180, 60);
  const current = deck[index];
  const podium = useMemo(() => standings(hits, participants), [hits, participants]);

  const finish = () => {
    setPhase("podium");
    celebrate();
    playSuccessHorn(soundEnabled);
  };

  const goNext = () => {
    if (index + 1 >= deck.length) {
      finish();
      return;
    }
    setIndex(index + 1);
  };
  // O relógio é montado uma vez por carta; as refs dão a ele a versão atual (índice, som).
  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  // Relógio de cada palavra (modo com tempo): reinicia a cada carta; ao zerar, a palavra passa sozinha.
  useEffect(() => {
    if (phase !== "play" || mode !== "timed") return;
    deadline.current = performance.now() + seconds * 1000;
    lastTick.current = seconds;
    setRemainingMs(seconds * 1000);
    const timer = window.setInterval(() => {
      const left = Math.max(0, deadline.current - performance.now());
      setRemainingMs(left);
      const whole = Math.ceil(left / 1000);
      if (whole <= 5 && whole > 0 && whole < lastTick.current) playTickSound(soundRef.current);
      lastTick.current = whole;
      if (left === 0) {
        window.clearInterval(timer);
        playTimerEndSound(soundRef.current);
        goNextRef.current();
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [phase, mode, seconds, index]);

  const addParticipant = (event: FormEvent) => {
    event.preventDefault();
    const error = participantError(nameInput, participants);
    setNameError(error);
    if (error) return;
    setParticipants([...participants, nameInput.trim()]);
    setNameInput("");
  };

  const start = () => {
    const { picked, used } = drawCards(cards, usedWords.current, Math.min(wordCount, cards.length));
    usedWords.current = used;
    setDeck(picked);
    setIndex(0);
    setHits({});
    setPhase("play");
  };

  const award = (name: string) => {
    setHits((current) => ({ ...current, [name]: (current[name] ?? 0) + 1 }));
    goNext();
  };

  const backToSetup = () => {
    setPhase("setup");
    setDeck([]);
    setIndex(0);
    setHits({});
  };

  const secondsLeft = Math.ceil(remainingMs / 1000);

  return (
    <GameLayout title="Palavras proibidas" onReset={backToSetup} resetOpen={resetOpen} setResetOpen={setResetOpen}>
      {phase === "setup" && (
        <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 py-8 text-center">
          <GameIcon id="proibidas" size={57} />
          <h2 className={roomHeadingClass}>Descreva sem dizer</h2>
          <p className={roomDescriptionClass}>
            Só quem conduz vê a palavra e as proibidas. Ele descreve em voz alta, sem falar nenhuma delas, e toca em
            quem acertou primeiro. Cada um joga por si.
          </p>

          <div className="flex w-full flex-col gap-3 rounded-md border border-[#4a34a8] bg-[#150d33] p-4 text-left">
            <h3 className="flex items-center gap-2 font-game-pixel text-sm text-white">
              <Users size={16} /> Participantes ({participants.length})
            </h3>
            <form onSubmit={addParticipant} className="flex gap-2">
              <Input
                value={nameInput}
                onChange={(event) => setNameInput(event.target.value)}
                placeholder="Nome do participante"
                aria-label="Nome do participante"
                aria-invalid={Boolean(nameError)}
                aria-describedby="participant-error"
                maxLength={30}
                className="flex-1"
              />
              <GameButton type="submit" variant="info" size="sm" className="shrink-0">
                <Plus /> Incluir
              </GameButton>
            </form>
            {nameError && (
              <small className="-mt-1.5 block text-xs font-bold text-[#ff8fab]" id="participant-error">
                {nameError}
              </small>
            )}
            {participants.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {participants.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-1 rounded-full border border-[#4a34a8] bg-[#1b1040] py-1 pr-1 pl-3 text-sm text-white">
                    {name}
                    <button
                      type="button"
                      aria-label={`Remover ${name}`}
                      onClick={() => setParticipants(participants.filter((other) => other !== name))}
                      className="grid size-6 place-items-center rounded-full text-[#c2b9d1] hover:bg-white/10">
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="w-full rounded-md border border-[#4a34a8] bg-[#150d33] p-4 text-left">
            <div className="flex items-center justify-between gap-3 py-2 text-base font-bold text-[#c2b9d1]">
              <span>Palavras</span>
              <NumberStepper
                ariaLabel="Total de palavras"
                min={3}
                max={50}
                value={wordCountInput}
                onChange={setWordCountInput}
                onBlur={() => setWordCountInput(String(wordCount))}
              />
            </div>
            <div className="py-2 text-base font-bold text-[#c2b9d1]">
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
              <div className="flex items-center justify-between gap-3 py-2 text-base font-bold text-[#c2b9d1]">
                <span>Segundos por palavra</span>
                <NumberStepper
                  ariaLabel="Segundos por palavra"
                  min={15}
                  max={180}
                  step={5}
                  value={secondsInput}
                  onChange={setSecondsInput}
                  onBlur={() => setSecondsInput(String(seconds))}
                />
              </div>
            ) : (
              <p className="py-2 text-xs text-[#9b97b2]">Sem relógio: a partida segue até acabarem as palavras.</p>
            )}
          </div>

          <GameActions>
            <GameButton variant="game" disabled={participants.length < 2} onClick={start}>
              <Play /> Começar
            </GameButton>
          </GameActions>
          {participants.length < 2 && <small className="text-xs text-[#bcb5cf]">Inclua pelo menos 2 participantes.</small>}
        </section>
      )}

      {phase === "play" && current && (
        <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 py-6">
          <div className="flex w-full items-end justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <span className="text-sm text-[#c9c4dd]">Palavra</span>
              <LedSign className="w-full text-center">
                {index + 1}/{deck.length}
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

          <article
            aria-live="polite"
            className="neon-box flex w-full flex-col gap-6 rounded-md border border-[#4a34a8] bg-[#150d33] p-6 text-center [--neon-c:#ff9f43]">
            {/* p/h2 têm margem zerada fora de camada em styles.css: o espaçamento vem do gap */}
            <div className="flex flex-col gap-2">
              <p className="text-xs tracking-[.12em] text-[#9b97b2] uppercase">Descreva</p>
              <h2 className="font-game-pixel text-[clamp(22px,7vw,40px)] leading-tight break-words text-white">
                {current.word}
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              <p className="flex items-center justify-center gap-2 text-xs tracking-[.12em] text-[#ff8fab] uppercase">
                <Ban size={14} /> Não pode falar
              </p>
              <ul className="grid gap-2">
                {current.forbidden.map((word) => (
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
              {participants.map((name) => (
                <GameButton key={name} variant="info" size="sm" className="min-w-0 truncate" onClick={() => award(name)}>
                  {name}
                  {hits[name] ? <Badge className="ml-1 bg-[#0d0b1f] text-white">{hits[name]}</Badge> : null}
                </GameButton>
              ))}
            </div>
          </div>
          <GameActions>
            <GameButton variant="special" onClick={goNext}>
              <SkipForward /> Ninguém acertou
            </GameButton>
          </GameActions>
        </section>
      )}

      {phase === "podium" && (
        <section className="mx-auto flex w-full max-w-[560px] flex-col items-center gap-6 py-8 text-center">
          <Trophy className="text-[#fdcb6e]" size={48} />
          <Badge variant="outline">RESULTADO FINAL</Badge>
          <h2 className="font-heading text-[34px] font-bold">Pódio da alcateia</h2>
          <ol className="grid w-full gap-2" aria-label="Pódio">
            {podium.map(({ name, hits: count, rank }) => {
              const isWinner = rank === 1 && count > 0;
              return (
                <li
                  key={name}
                  className={`grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-[6px] p-3.5 text-left ${isWinner ? "bg-[#fdcb6e] text-[#29223e]" : "bg-[#1b1040]"}`}>
                  <span className={`font-heading text-xl font-bold ${isWinner ? "text-[#4b3c16]" : "text-[#bbb5d3]"}`}>
                    {rank}º
                  </span>
                  <strong className="truncate">{name}</strong>
                  <small className={isWinner ? "text-[#4b3c16]" : "text-[#b8b2c8]"}>
                    {count} {count === 1 ? "acerto" : "acertos"}
                  </small>
                </li>
              );
            })}
          </ol>
          <GameActions>
            <GameButton variant="game" onClick={start}>
              <RotateCcw /> Jogar novamente
            </GameButton>
            <GameButton variant="special" onClick={backToSetup}>
              <Users /> Mudar participantes
            </GameButton>
          </GameActions>
        </section>
      )}
    </GameLayout>
  );
}
