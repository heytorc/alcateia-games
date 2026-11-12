/** Dígitos de LED de sete segmentos (SVG), usados pelo cronômetro do Tempo Certo e pelo cofre. */
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

export const DIGITS: Record<string, string> = {
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
  "-": "g",
};

export type LedTone = "green" | "red" | "amber";
const TONES: Record<LedTone, { on: string; off: string }> = {
  green: { on: "#39ff7a", off: "#0b2b17" },
  red: { on: "#ff4552", off: "#2b0b10" },
  amber: { on: "#ffb000", off: "#2b1e06" },
};

/** Dígito de sete segmentos; um caractere fora da tabela (ex.: espaço) fica todo apagado. */
export function LedDigit({ char, tone = "green", className = "w-[13%]" }: { char: string; tone?: LedTone; className?: string }) {
  const on = DIGITS[char] ?? "";
  const { on: lit, off } = TONES[tone];
  return (
    <svg viewBox="0 0 60 100" className={`h-full ${className} min-w-0 shrink-0 overflow-visible`} aria-hidden="true">
      {SEGMENTS.map((points, index) => {
        const isLit = on.includes("abcdefg"[index]);
        return (
          <polygon
            key={index}
            points={points}
            fill={isLit ? lit : off}
            style={isLit ? { filter: `drop-shadow(0 0 4px ${lit})` } : undefined}
          />
        );
      })}
    </svg>
  );
}

export function LedColon() {
  return (
    <svg viewBox="0 0 16 100" className="h-full w-[4%] shrink-0 overflow-visible" aria-hidden="true">
      {[32, 68].map((cy) => (
        <circle key={cy} cx="8" cy={cy} r="6" fill="#39ff7a" style={{ filter: "drop-shadow(0 0 4px #39ff7a)" }} />
      ))}
    </svg>
  );
}

