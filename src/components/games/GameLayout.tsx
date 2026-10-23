import type { ReactNode } from "react";

import { ConfirmDialog, GameHeader, Shell } from "@/components";

export function GameLayout({
  title,
  children,
  settings,
  onSettings,
  onReset,
  resetOpen,
  setResetOpen,
}: {
  title: string;
  children: ReactNode;
  settings?: ReactNode;
  onSettings?: () => void;
  onReset: () => void;
  resetOpen: boolean;
  setResetOpen: (open: boolean) => void;
}) {
  return (
    <Shell>
      <main className="mx-auto w-[min(1180px,calc(100%-40px))] max-[760px]:w-[min(100%-28px,1180px)]">
        <GameHeader title={title} onSettings={onSettings} onReset={() => setResetOpen(true)} />
        <div className="flex min-h-[540px] flex-col gap-[15px] max-[760px]:min-h-[calc(100vh-240px)]">{children}</div>
        {settings}
        <ConfirmDialog
          open={resetOpen}
          title="Resetar sessão?"
          description="Todo o histórico desta rodada será apagado. Suas configurações continuam salvas."
          onClose={() => setResetOpen(false)}
          onConfirm={() => {
            onReset();
            setResetOpen(false);
          }}
        />
      </main>
    </Shell>
  );
}
