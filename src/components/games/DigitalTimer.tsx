import type { CSSProperties } from "react";

type DigitalTimerProps = {
  elapsedMs: number;
  running: boolean;
  finished: boolean;
  /** Acertou o tempo exato. */
  exact?: boolean;
  /** Embaça os dígitos enquanto roda. */
  blurReadout?: boolean;
  onPress: () => void;
};

const T = 10; // espessura dos segmentos
const horizontal = (x1: number, x2: number, y: number) =>
  `${x1},${y} ${x1 + T / 2},${y - T / 2} ${x2 - T / 2},${y - T / 2} ${x2},${y} ${x2 - T / 2},${y + T / 2} ${x1 + T / 2},${y + T / 2}`;
const vertical = (x: number, y1: number, y2: number) =>
  `${x},${y1} ${x + T / 2},${y1 + T / 2} ${x + T / 2},${y2 - T / 2} ${x},${y2} ${x - T / 2},${y2 - T / 2} ${x - T / 2},${y1 + T / 2}`;

/** Segmentos de um dígito de 60×100, na ordem a, b, c, d, e, f, g. */
const SEGMENTS = [
  horizontal(9, 51, 6),
  vertical(55, 9, 47),
  vertical(55, 53, 91),
  horizontal(9, 51, 94),
  vertical(5, 53, 91),
  vertical(5, 9, 47),
  horizontal(9, 51, 50),
];

const DIGITS: Record<string, string> = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgedc",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
};

function Digit({ char }: { char: string }) {
  const on = DIGITS[char] ?? "";
  return (
    <svg viewBox="0 0 60 100" className="h-full w-[13%] min-w-0 shrink-0 overflow-visible" aria-hidden="true">
      {SEGMENTS.map((points, index) => {
        const lit = on.includes("abcdefg"[index]);
        return (
          <polygon
            key={index}
            points={points}
            fill={lit ? "#ff3b30" : "#2b0b0b"}
            style={lit ? { filter: "drop-shadow(0 0 4px #ff2a1f)" } : undefined}
          />
        );
      })}
    </svg>
  );
}

function Colon() {
  return (
    <svg viewBox="0 0 16 100" className="h-full w-[4%] shrink-0 overflow-visible" aria-hidden="true">
      {[32, 68].map((cy) => (
        <circle key={cy} cx="8" cy={cy} r="6" fill="#ff3b30" style={{ filter: "drop-shadow(0 0 4px #ff2a1f)" }} />
      ))}
    </svg>
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Painel de LED de sete segmentos (mm:ss:cc), que também é o botão de iniciar e parar. */
export function DigitalTimer({ elapsedMs, running, finished, exact = false, blurReadout = false, onPress }: DigitalTimerProps) {
  const total = Math.max(0, Math.floor(elapsedMs));
  const text = `${pad(Math.floor(total / 60_000))}:${pad(Math.floor((total % 60_000) / 1_000))}:${pad(Math.floor((total % 1_000) / 10))}`;
  const hint = finished ? (exact ? "TEMPO EXATO!" : "PARADO") : running ? "TOQUE PARA PARAR" : "TOQUE PARA INICIAR";

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={finished}
      aria-label={finished ? "Cronômetro parado" : running ? "Parar o cronômetro" : "Iniciar o cronômetro"}
      className="group relative w-full max-w-[560px] cursor-pointer rounded-xl border-2 border-[#262626] bg-[linear-gradient(180deg,#1b1b1b,#0b0b0b)] p-3 shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.08)] outline-none focus-visible:ring-2 focus-visible:ring-(--neon-cyan) focus-visible:ring-offset-4 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-default">
      <div className="relative overflow-hidden rounded-lg border border-black bg-[#050404] px-4 pt-5 pb-3 shadow-[inset_0_0_30px_rgba(0,0,0,.9)]">
        <time
          dateTime={`PT${(elapsedMs / 1000).toFixed(2)}S`}
          aria-hidden="true"
          className={`flex h-[clamp(56px,17vw,104px)] w-full items-center justify-center gap-[1%] ${blurReadout ? "select-none blur-[14px]" : ""}`}
          style={{ transform: "skewX(-6deg)" } as CSSProperties}>
          {text.split("").map((char, index) => (char === ":" ? <Colon key={index} /> : <Digit key={index} char={char} />))}
        </time>
        <span
          className={`mt-3 block text-center font-game-pixel text-[11px] tracking-[.2em] ${
            exact ? "text-[#ffe14a]" : running ? "text-[#ff6b61]" : "text-[#8a2b25]"
          }`}>
          {hint}
        </span>
        {/* reflexo do vidro */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,.07),transparent)]" />
      </div>
      <span aria-hidden="true" className={`absolute top-1.5 right-4 size-1.5 rounded-full ${running ? "bg-[#ff3b30] shadow-[0_0_6px_#ff3b30]" : "bg-[#3a1210]"}`} />
    </button>
  );
}
