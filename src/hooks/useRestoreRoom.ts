import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { GameId } from "@/constants/games";
import { useGameStore } from "@/lib/store";

const hostKey = (game: GameId, pin: string) => `host_room_${game}_${pin}`;

/** Guarda (ou apaga) que este navegador é o anfitrião da sala, para recuperar o papel após recarregar a página. */
export function setHostRoom(game: GameId, pin: string, host: boolean) {
  try {
    if (host) localStorage.setItem(hostKey(game, pin), "true");
    else localStorage.removeItem(hostKey(game, pin));
  } catch {
    /* armazenamento indisponível: o papel de anfitrião só dura até recarregar */
  }
}

export function isHostRoom(game: GameId, pin: string) {
  try {
    return localStorage.getItem(hostKey(game, pin)) === "true";
  } catch {
    return false;
  }
}

/**
 * Reentra na sala ao abrir a página: usa o `?pin=` da URL ou, sem ele, a última sala
 * deste jogo guardada no store (e devolve o PIN à URL). `onRestore` recebe o PIN a retomar.
 */
export function useRestoreRoom(game: GameId, onRestore: (pin: string) => void) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const restore = useRef(onRestore);
  restore.current = onRestore;

  useEffect(() => {
    const pinParam = searchParams.get("pin");
    if (pinParam) {
      restore.current(pinParam);
      return;
    }
    const { lastRoomID, lastGameType } = useGameStore.getState();
    if (lastRoomID && lastGameType === game) {
      restore.current(lastRoomID);
      navigate(`?pin=${lastRoomID}`, { replace: true });
    }
  }, [searchParams, navigate, game]);
}
