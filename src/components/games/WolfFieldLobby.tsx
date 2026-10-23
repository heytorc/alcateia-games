import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import type { PlayerListItem } from "@/components/games/PlayerList";

/** Nome do arquivo em `public/wolves/` e duração (ms) de um ciclo do GIF. */
const LOOP_MS = {
  sitting: 1920,
  walking: 960,
  running: 560,
  alert: 1600,
  growling: 1120,
  howling: 2400,
  jumping: 1600,
  "looking-around": 2640,
  resting: 2400,
  sleeping: 1920,
  "waking-up": 3360,
  "sit-stand": 2880,
} as const;
type Mode = keyof typeof LOOP_MS;
type Pose = { x: number; mode: Mode; dir: 1 | -1; ms: number };

const gif = (mode: Mode) => `${import.meta.env.BASE_URL}wolves/${mode}.gif`;
/** Velocidade em % do percurso por segundo. */
const SPEED = { walking: 7, running: 18 } as const;
/** Atividades ao chegar: [animação, peso, mínimo e máximo de ciclos]. */
const IDLES: [Mode, number, number, number][] = [
  ["sitting", 3, 2, 4],
  ["looking-around", 3, 1, 2],
  ["alert", 2, 1, 3],
  ["resting", 2, 2, 3],
  ["jumping", 2, 1, 3],
  ["howling", 1, 1, 1],
  ["growling", 1, 1, 2],
  ["sit-stand", 1, 1, 1],
  ["sleeping", 2, 3, 5],
];

function pickIdle() {
  let roll = Math.random() * IDLES.reduce((sum, i) => sum + i[1], 0);
  const idle = IDLES.find((i) => (roll -= i[1]) < 0) ?? IDLES[0];
  return { mode: idle[0], ms: LOOP_MS[idle[0]] * (idle[2] + Math.floor(Math.random() * (idle[3] - idle[2] + 1))) };
}

/** Recolore o GIF base (matiz 0 = cor padrão). O matiz sai do hash do id: igual em todas as telas e estável quando outros entram ou saem. */
const tintFor = (id: string) => {
  let hash = 2166136261;
  for (const ch of id) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  hash = Math.imul(hash ^ (hash >>> 15), 2246822507) >>> 0;
  const hue = hash % 360;
  return hue < 20 ? "none" : `hue-rotate(${hue}deg) saturate(2.4)`;
};

/** Linhas do campo (% da altura): só mudam a profundidade, o lobo nunca sai da sua. */
const LANES = [3, 9, 15];
const PAD = 12;

/** Easing em degraus para o visual 8-bit do teleporte. */
const stepEase = (t: number) => Math.round(t * 6) / 6;
const beamTransition = { duration: 0.7, ease: stepEase, times: [0, 0.25, 0.75, 1] };
const dissolved = { scaleY: 0.04, scaleX: 1.5, opacity: 0, filter: "brightness(3) saturate(0)" };
const materialized = { scaleY: 1, scaleX: 1, opacity: 1, filter: "brightness(1) saturate(1)" };

function Wolf({ player, tint, still }: { player: PlayerListItem; tint: string; still: boolean }) {
  const [lane] = useState(() => Math.floor(Math.random() * LANES.length));
  const [pose, setPose] = useState<Pose>(() => ({ x: Math.random() * 100, mode: "sitting", dir: 1, ms: 0 }));
  const xRef = useRef(pose.x);

  useEffect(() => {
    if (still) return;
    let timer = 0;
    const roam = () => {
      const from = xRef.current;
      let to = Math.random() * 100;
      while (Math.abs(to - from) < 15) to = Math.random() * 100;
      const mode = Math.random() < 0.65 ? "walking" : "running";
      const ms = (Math.abs(to - from) / SPEED[mode]) * 1000;
      xRef.current = to;
      setPose({ x: to, mode, dir: to > from ? 1 : -1, ms });
      timer = window.setTimeout(rest, ms);
    };
    const rest = () => {
      const idle = pickIdle();
      setPose((p) => ({ ...p, mode: idle.mode, ms: 0 }));
      timer = window.setTimeout(() => {
        if (idle.mode !== "sleeping") return roam();
        setPose((p) => ({ ...p, mode: "waking-up" }));
        timer = window.setTimeout(roam, LOOP_MS["waking-up"]);
      }, idle.ms);
    };
    timer = window.setTimeout(roam, 1200 + Math.random() * 2000);
    return () => window.clearTimeout(timer);
  }, [still]);

  const reduced = still;
  const enter = reduced ? { duration: 0.2 } : { duration: 0.45, delay: 0.15, ease: stepEase };
  const leave = reduced ? { duration: 0.2 } : { duration: 0.45, ease: stepEase };

  return (
    <div
      className="wolf-actor"
      style={{
        left: `calc((100% - var(--wolf) - ${PAD * 2}px) * ${pose.x / 100} + ${PAD}px)`,
        bottom: `calc(${LANES[lane]}% - var(--wolf) * 0.16)`,
        zIndex: LANES.length - lane,
        transition: `left ${pose.ms}ms linear`,
      }}>
      {!reduced && (
        <>
          <motion.div
            className="wolf-beam"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], transition: beamTransition }}
            exit={{ opacity: [0, 1, 1, 0], transition: beamTransition }}
          />
          <motion.div
            className="wolf-pad"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], transition: beamTransition }}
            exit={{ opacity: [0, 1, 1, 0], transition: beamTransition }}
          />
        </>
      )}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: "50% 70%" }}
        initial={reduced ? { opacity: 0 } : dissolved}
        animate={{ ...(reduced ? { opacity: 1 } : materialized), transition: enter }}
        exit={{ ...(reduced ? { opacity: 0 } : dissolved), transition: leave }}>
        <span className="wolf-label" data-self={player.tag ? "true" : undefined}>
          <span>
            {player.avatar} {player.name}
          </span>
          {player.tag && <em>{player.tag}</em>}
        </span>
        <img src={gif(pose.mode)} alt="" draggable={false} style={{ transform: `scaleX(${pose.dir})`, filter: tint }} />
      </motion.div>
    </div>
  );
}

/** Hero em largura total da tela (escapa do container da página). Campo de floresta à noite onde cada participante da sala é um lobo; entradas e saídas teleportam. */
export function WolfFieldLobby({ players }: { players: PlayerListItem[] }) {
  const still = useReducedMotion() ?? false;
  return (
    <div role="group" aria-label="Campo da alcateia" className="w-screen max-w-none">
      <div className="wolf-field" aria-hidden="true">
        <div className="wolf-field__stars" />
        <div className="wolf-field__moon" />
        <div className="wolf-field__trees wolf-field__trees--far" />
        <div className="wolf-field__trees wolf-field__trees--near" />
        <div className="wolf-field__mist" />
        <div className="wolf-field__ground" />
        <AnimatePresence>
          {players.map((player) => (
            <Wolf key={player.id} player={player} tint={tintFor(player.id)} still={still} />
          ))}
        </AnimatePresence>
      </div>
      <ul className="sr-only">
        {players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>
    </div>
  );
}
