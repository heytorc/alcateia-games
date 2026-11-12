import type { CSSProperties } from "react";
import { LedColon, LedDigit } from "@/components/games/LedDigits";

type DigitalTimerProps = {
  elapsedMs: number;
  running: boolean;
  finished: boolean;
  /** Acertou o tempo exato. */
  exact?: boolean;
  /** Esconde os dígitos (--:--:--) enquanto roda. */
  hideReadout?: boolean;
  onPress: () => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Painel de LED de sete segmentos (mm:ss:cc), que também é o botão de iniciar e parar. */
export function DigitalTimer({ elapsedMs, running, finished, exact = false, hideReadout = false, onPress }: DigitalTimerProps) {
  const total = Math.max(0, Math.floor(elapsedMs));
  const realText = `${pad(Math.floor(total / 60_000))}:${pad(Math.floor((total % 60_000) / 1_000))}:${pad(Math.floor((total % 1_000) / 10))}`;
  // Oculto: os dígitos reais nem chegam ao DOM.
  const text = hideReadout ? "--:--:--" : realText;
  const celebrating = finished && exact;
  const hint = finished ? (exact ? "TEMPO EXATO!" : "PARADO") : running ? "TOQUE PARA PARAR" : "TOQUE PARA INICIAR";

  return (
    <button
      type="button"
      onClick={onPress}
      disabled={finished}
      aria-label={finished ? "Cronômetro parado" : running ? "Parar o cronômetro" : "Iniciar o cronômetro"}
      className={`group relative w-full max-w-[560px] cursor-pointer rounded-xl border-2 bg-[linear-gradient(180deg,#1b1b1b,#0b0b0b)] p-3 transition-[border-color,box-shadow] duration-200 outline-none motion-reduce:transition-none ${
        celebrating
          ? "border-[#ffe14a] shadow-[0_0_18px_#ffe14a,inset_0_0_14px_rgba(255,225,74,.35)]"
          : running
            ? "border-[#39ff7a] shadow-[0_0_14px_#39ff7a,inset_0_0_12px_rgba(57,255,122,.3)]"
            : "border-[#262626] shadow-[0_10px_30px_rgba(0,0,0,.6),inset_0_1px_0_rgba(255,255,255,.08)]"
      } focus-visible:ring-2 focus-visible:ring-(--neon-cyan) focus-visible:ring-offset-4 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-default`}>
      <div className="relative overflow-hidden rounded-lg border border-black bg-[#050404] px-4 pt-5 pb-3 shadow-[inset_0_0_30px_rgba(0,0,0,.9)]">
        <time
          dateTime={hideReadout ? undefined : `PT${(elapsedMs / 1000).toFixed(2)}S`}
          aria-hidden="true"
          className={`flex h-[clamp(56px,17vw,104px)] w-full items-center justify-center gap-[1%] ${celebrating ? "blink" : ""}`}
          style={{ transform: "skewX(-6deg)" } as CSSProperties}>
          {text.split("").map((char, index) => (char === ":" ? <LedColon key={index} /> : <LedDigit key={index} char={char} />))}
        </time>
        <span
          className={`mt-3 block text-center font-game-pixel text-[11px] tracking-[.2em] ${
            exact ? "text-[#ffe14a]" : running ? "text-[#8dffb5]" : "text-[#1f7a43]"
          }`}>
          {hint}
        </span>
        {/* reflexo do vidro */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,.07),transparent)]" />
      </div>
      <span aria-hidden="true" className={`absolute top-1.5 right-4 size-1.5 rounded-full ${running ? "bg-[#39ff7a] shadow-[0_0_6px_#39ff7a]" : "bg-[#10331c]"}`} />
    </button>
  );
}
