import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

type LedSignProps = {
  children: ReactNode;
  /** Cor do neon (qualquer cor CSS). */
  color?: string;
  /** Intervalo, em segundos, entre cada piscada. */
  blinkEvery?: number;
  className?: string;
};

/** Letreiro de LED: tubo de neon arredondado com texto brilhante que pisca a cada `blinkEvery` segundos. */
export function LedSign({ children, color = "#ff2e93", blinkEvery = 4, className }: LedSignProps) {
  const style = { "--led": color, "--led-every": `${blinkEvery}s` } as CSSProperties;
  return (
    <div className={cn("led-sign", className)} style={style} role="status">
      <span className="led-sign__text">{children}</span>
    </div>
  );
}
