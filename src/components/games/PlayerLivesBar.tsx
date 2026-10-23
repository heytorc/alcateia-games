import React, { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';

interface Player {
  id: string;
  name: string;
  avatar: string;
  lives: number;
  maxLives: number;
}

interface PlayerLivesBarProps {
  players: Player[];
  /** Ordem de jogo da rodada atual (ids). */
  order: string[];
  /** Quem joga agora; recebe o destaque neon. */
  activeId: string | null;
  /** Embaralha os cards antes de revelar a ordem da rodada. */
  shuffling: boolean;
  onShuffleDone: () => void;
}

const SHUFFLE_TICKS = 8;
const SHUFFLE_TICK_MS = 280;

function randomPermutation<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const PlayerLivesBar: React.FC<PlayerLivesBarProps> = ({ players, order, activeId, shuffling, onShuffleDone }) => {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(order);
  const doneRef = useRef(onShuffleDone);
  doneRef.current = onShuffleDone;
  const orderKey = order.join('|');

  useEffect(() => {
    setDisplay(order);
    if (!shuffling) return;

    if (reduceMotion) {
      const timer = setTimeout(() => doneRef.current(), 1200);
      return () => clearTimeout(timer);
    }

    let ticks = 0;
    let finish: ReturnType<typeof setTimeout> | undefined;
    const interval = setInterval(() => {
      ticks++;
      if (ticks < SHUFFLE_TICKS) {
        setDisplay(randomPermutation(order));
        return;
      }
      clearInterval(interval);
      setDisplay(order);
      finish = setTimeout(() => doneRef.current(), 900);
    }, SHUFFLE_TICK_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(finish);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shuffling, orderKey, reduceMotion]);

  const byId = new Map(players.map((p) => [p.id, p]));
  const ids = [...display, ...players.map((p) => p.id).filter((id) => !display.includes(id))];
  const cards = ids.flatMap((id) => byId.get(id) ?? []);

  return (
    <div className="flex flex-wrap justify-center gap-4 p-4 mb-4">
      {cards.map((player) => {
        const position = order.indexOf(player.id) + 1;
        const active = player.id === activeId;
        return (
          <motion.div
            key={player.id}
            layout={!reduceMotion}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            aria-current={active ? 'true' : undefined}
            className={`relative flex flex-col items-center gap-1 bg-white/5 p-2 rounded-md min-w-[80px] ${
              active ? 'neon-box' : 'border-2 border-[#4a34a8]'
            } ${player.lives <= 0 ? 'opacity-50' : ''}`}
          >
            {position > 0 && !shuffling && (
              <span className="absolute -top-2 -left-2 grid h-5 min-w-5 place-items-center rounded-md border-2 border-[#6b3cff] bg-accent px-1 font-game-pixel text-[10px] text-accent-foreground">
                {position}º
              </span>
            )}
            <span className="text-3xl leading-none" aria-hidden="true">{player.avatar}</span>
            <span className="text-xs font-medium truncate max-w-[70px]">{player.name}</span>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: player.maxLives }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-4 h-4 ${
                    i >= player.lives
                      ? 'text-gray-400 filter grayscale'
                      : 'text-red-500 fill-red-500'
                  } transition-all duration-300`}
                  strokeWidth={3}
                />
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};
