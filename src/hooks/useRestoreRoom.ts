import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { GameId } from "@/constants/games";
import { useGameStore } from "@/lib/store";

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
