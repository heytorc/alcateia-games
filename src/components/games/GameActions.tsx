import * as React from "react";

import { cn } from "@/lib/utils";

type GameActionsProps = React.ComponentProps<"div"> & {
  /** Fixa o grupo no rodapé da tela (formulários longos). */
  sticky?: boolean;
};

/**
 * Grupo padrão de botões de ação: coluna de largura cheia no mobile, linha de
 * larguras iguais a partir de `sm`. Ordem dos filhos: principal, alternativa,
 * neutra e, por último, a destrutiva (ver papéis em `GameButton`).
 */
function GameActions({ sticky, className, ...props }: GameActionsProps) {
  return (
    <div
      {...props}
      className={cn(
        "mx-auto flex w-full max-w-[420px] flex-col gap-2.5",
        "sm:max-w-none sm:flex-row sm:justify-center",
        "[&>*]:w-full [&>*]:min-w-0 sm:[&>*]:w-auto sm:[&>*]:flex-1 sm:[&>*]:max-w-[240px]",
        sticky && "sticky bottom-0 bg-background pt-3 pb-1",
        className,
      )}
    />
  );
}

export { GameActions };
