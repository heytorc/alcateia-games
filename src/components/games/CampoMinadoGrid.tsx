import React, { useEffect, useRef, useState } from 'react';
import { GameIcon } from "@/components/games/GameIcon";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

import type { CellStatus } from '@/lib/campo-minado-rules';

export type { CellStatus };

interface CampoMinadoGridProps {
  rows: number;
  cols: number;
  phase: 'LOBBY' | 'PLAYING';
  cellStatuses: Record<number, CellStatus>;
  onCellClick: (index: number) => void;
  myBombs: number[]; // Only for LOBBY phase
  showMyBombs?: boolean; // Configuration
  disabled?: boolean;
}

export const CampoMinadoGrid: React.FC<CampoMinadoGridProps> = ({
  rows,
  cols,
  phase,
  cellStatuses,
  onCellClick,
  myBombs,
  showMyBombs = true,
  disabled = false,
}) => {
  const totalCells = rows * cols;
  const reduceMotion = useReducedMotion();
  const [hit, setHit] = useState(false);
  const explodedCount = Object.values(cellStatuses).filter((s) => s === 'EXPLODED').length;
  const lastExploded = useRef(explodedCount);

  // Toda bomba nova (de qualquer jogador) balança o campo e avermelha a borda por um instante.
  useEffect(() => {
    const increased = explodedCount > lastExploded.current;
    lastExploded.current = explodedCount;
    if (!increased) return;
    setHit(true);
    const timer = setTimeout(() => setHit(false), 600);
    return () => clearTimeout(timer);
  }, [explodedCount]);

  return (
    <motion.div
      className="mx-auto grid gap-[3px] rounded-md border-2 bg-[#0a0618] p-2 sm:gap-1"
      animate={{
        x: hit && !reduceMotion ? [0, -10, 10, -8, 8, -4, 4, 0] : 0,
        borderColor: hit ? '#ff4552' : '#2ecc71',
        boxShadow: hit ? '0 0 18px rgba(255,69,82,.8)' : '0 0 14px rgba(46,204,113,.6)',
      }}
      transition={{ x: { duration: 0.5 }, borderColor: { duration: 0.15 }, boxShadow: { duration: 0.15 } }}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        width: '100%',
        // células entre 20 e 56 px: campos grandes rolam na horizontal em vez de ficarem ilegíveis
        minWidth: cols * 22 + 8,
        maxWidth: cols * 60 + 16,
      }}
    >
      {Array.from({ length: totalCells }).map((_, index) => {
        const status = cellStatuses[index] || 'HIDDEN';
        const isMyBomb = myBombs.includes(index);

        return (
          <motion.button
            key={index}
            initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 18, delay: reduceMotion ? 0 : Math.min(1.2, ((index % cols) + Math.floor(index / cols)) * 0.028) }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onCellClick(index)}
            disabled={disabled}
            className={`
              relative aspect-square w-full rounded-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60
              ${status === 'HIDDEN' ? 'bg-[#0f3d2a] border-2 border-[#2ecc71] enabled:hover:bg-[#145a3c] shadow-[0_0_6px_rgba(46,204,113,.5)]' : ''}
              ${status === 'REVEALED' ? 'bg-[#1b1040] border-2 border-[#3a2a80]' : ''}
              ${status === 'EXPLODED' ? 'bg-[#5a0f1c] border-2 border-[#ff4552] shadow-[0_0_10px_#ff4552]' : ''}
              border-t-2 border-l-2 border-r-2 border-white/20
            `}
            style={{
                backgroundColor: status === 'REVEALED' ? '#78350f' : undefined // Custom dirt color
            }}
          >
            <AnimatePresence>
              {/* Placement Indicator (LOBBY) */}
              {phase === 'LOBBY' && isMyBomb && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <GameIcon id="campo-minado" size={24} />
                </motion.div>
              )}

              {/* Mine Indicator (PLAYING - Configurable) */}
              {phase === 'PLAYING' && showMyBombs && isMyBomb && status === 'HIDDEN' && (
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                  <GameIcon id="campo-minado" size={16} className="opacity-60" />
                </div>
              )}

              {/* Explosion Animation */}
              {status === 'EXPLODED' && (
                <motion.div
                  initial={{ scale: 0, opacity: 1 }}
                  animate={{ scale: 1.5 }}
                  transition={{ duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <GameIcon id="explosao" size={28} />
                </motion.div>
              )}

              {/* Dirt Detail (REVEALED) */}
              {status === 'REVEALED' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                >
                  <div className="w-full h-full bg-amber-900/20" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        );
      })}
    </motion.div>
  );
};
