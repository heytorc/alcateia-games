import * as React from "react";

import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Rodapé padrão de diálogos: cancelar (`special`) à esquerda, confirmar (`game`) à direita. */
function GameDialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof DialogFooter>) {
  return (
    <DialogFooter
      {...props}
      className={cn(
        "m-0 flex-row justify-end gap-[9px] border-0 bg-transparent p-0 max-[480px]:flex-col-reverse max-[480px]:[&>*]:w-full",
        className,
      )}
    />
  );
}

export { GameDialogFooter };
