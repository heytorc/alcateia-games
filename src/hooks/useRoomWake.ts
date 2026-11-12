import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Detecta a volta do app (aba visível de novo, página restaurada, rede de volta) e garante a conexão:
 * com o canal fora de `joined`, devolve uma chave nova (inclua-a nas deps do efeito do canal para recriá-lo,
 * e o próprio `SUBSCRIBED` já pede a ressincronização); com o canal de pé, só pede `onResync` ao anfitrião.
 */
export function useRoomWake(
  channelRef: MutableRefObject<RealtimeChannel | null>,
  enabled: boolean,
  onResync: () => void,
): number {
  const [reconnectKey, setReconnectKey] = useState(0);
  const resync = useRef(onResync);
  resync.current = onResync;

  useEffect(() => {
    if (!enabled) return;
    const wake = () => {
      if (document.visibilityState === "hidden") return;
      const channel = channelRef.current;
      if (!channel || channel.state !== "joined") setReconnectKey((key) => key + 1);
      else resync.current();
    };
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pageshow", wake);
    window.addEventListener("online", wake);
    window.addEventListener("focus", wake);
    return () => {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pageshow", wake);
      window.removeEventListener("online", wake);
      window.removeEventListener("focus", wake);
    };
  }, [channelRef, enabled]);

  return reconnectKey;
}
