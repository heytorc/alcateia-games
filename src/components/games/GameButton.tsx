import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Papéis das variantes (cores em `--btn-*`, `src/styles.css`):
 * - `game` (rosa): ação principal do grupo, uma por grupo.
 * - `info` (ciano): alternativa de mesmo peso (entrar na sala, nova rodada).
 * - `special` (roxo): neutra (cancelar, sair, voltar, item não selecionado).
 * - `warning` (amarelo): resultado (ver pódio, placar).
 * - `danger` (vermelho): somente destrutiva (encerrar sala).
 * - `success` (verde): somente estado já ocorrido (pronto, votou), nunca ação.
 */
const gameButtonVariants = cva(
  [
    "inline-flex cursor-pointer items-center justify-center gap-[9px]",
    "rounded-md border-2 border-(--glow) bg-(--fill) text-(--ink)",
    "px-[18px] py-[13px] text-[12px] font-game-pixel uppercase tracking-[.06em]",
    "shadow-[0_0_14px_var(--glow),inset_0_0_10px_color-mix(in_srgb,var(--glow)_35%,transparent)]",
    "transition-[transform,background-color,box-shadow] duration-150",
    "hover:bg-[color-mix(in_srgb,var(--fill)_85%,transparent)] dark:hover:bg-[color-mix(in_srgb,var(--fill)_85%,transparent)]",
    "hover:text-(--ink) hover:shadow-[0_0_22px_var(--glow),inset_0_0_10px_color-mix(in_srgb,var(--glow)_35%,transparent)]",
    "active:translate-y-[2px] active:bg-[color-mix(in_srgb,var(--fill)_75%,transparent)] dark:active:bg-[color-mix(in_srgb,var(--fill)_75%,transparent)]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
    "motion-reduce:transition-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        game: "[--fill:var(--btn-game-fill)] [--glow:var(--btn-game-glow)] [--ink:var(--btn-game-ink)]",
        info: "[--fill:var(--btn-info-fill)] [--glow:var(--btn-info-glow)] [--ink:var(--btn-info-ink)]",
        special:
          "[--fill:var(--btn-special-fill)] [--glow:var(--btn-special-glow)] [--ink:var(--btn-special-ink)]",
        warning:
          "[--fill:var(--btn-warning-fill)] [--glow:var(--btn-warning-glow)] [--ink:var(--btn-warning-ink)]",
        danger:
          "[--fill:var(--btn-danger-fill)] [--glow:var(--btn-danger-glow)] [--ink:var(--btn-danger-ink)]",
        success:
          "[--fill:var(--btn-success-fill)] [--glow:var(--btn-success-glow)] [--ink:var(--btn-success-ink)]",
      },
      size: {
        default: "min-h-12 min-w-[9.5rem]",
        sm: "min-h-10 px-3 py-2 text-xs",
        lg: "min-h-14 px-7 py-4 text-base",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: {
      variant: "game",
      size: "default",
    },
  },
);

type GameButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size"
> &
  VariantProps<typeof gameButtonVariants>;

function GameButton({
  variant = "game",
  size = "default",
  className,
  ...props
}: GameButtonProps) {
  return (
    <Button
      {...props}
      variant="ghost"
      size="default"
      className={cn(
        gameButtonVariants({ variant, size }),
        className,
      )}
    />
  );
}

export { GameButton, gameButtonVariants };
