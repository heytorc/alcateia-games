import { Slider as SliderPrimitive } from "radix-ui";
import { useId } from "react";

type NeonSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Texto exibido ao lado do valor (ex.: "linhas"). */
  unit?: string;
};

/** Controle deslizante neon com valor em destaque; acessível por teclado e toque (Radix Slider). */
export function NeonSlider({ label, value, min, max, step = 1, onChange, unit }: NeonSliderProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <span id={id} className="font-game-pixel text-[13px] tracking-[.14em] text-brand-accent uppercase">
          {label}
        </span>
        <output
          htmlFor={id}
          className="min-w-[64px] rounded-md border-2 border-(--btn-info-glow) bg-[#0a0618] px-3 py-1.5 text-center font-game-pixel text-base text-white shadow-[0_0_10px_var(--btn-info-glow)]">
          {value}
          {unit && <span className="ml-1 text-[11px] text-white/60">{unit}</span>}
        </output>
      </div>
      <SliderPrimitive.Root
        aria-labelledby={id}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        className="relative flex h-9 w-full touch-none items-center select-none">
        <SliderPrimitive.Track className="relative h-3 grow rounded-full border-2 border-[#4a34a8] bg-[#0a0618]">
          <SliderPrimitive.Range className="absolute h-full rounded-full bg-[linear-gradient(90deg,var(--neon-pink),var(--neon-cyan))] shadow-[0_0_12px_var(--neon-pink)]" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block size-7 rounded-full border-2 border-white bg-(--neon-pink) shadow-[0_0_14px_var(--neon-pink),0_0_0_4px_rgba(255,46,147,.2)] outline-none transition-transform focus-visible:ring-2 focus-visible:ring-(--neon-cyan) focus-visible:ring-offset-2 focus-visible:ring-offset-[#150d33] active:scale-110 motion-reduce:transition-none" />
      </SliderPrimitive.Root>
    </div>
  );
}
