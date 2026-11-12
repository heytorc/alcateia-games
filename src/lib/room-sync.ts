import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Ressincronização de salas. O Realtime não reenvia o que se perdeu com a conexão caída (aba em segundo plano,
 * rede instável), então todo participante guarda o log dos eventos da rodada atual: o log recomeça a cada evento
 * de `resetEvents`. Quem volta pede o log ao anfitrião; se o dele for diferente do local, adota o do anfitrião
 * reaplicando cada evento pelos mesmos handlers. O anfitrião também persiste o log para sobreviver a um reload.
 */
// Os payloads variam por evento; cada jogo tipa o seu dentro do handler.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SyncHandler = (payload: any, meta: { replay: boolean }) => void;
type Entry = { event: string; payload: unknown };

type Options = {
  channel: RealtimeChannel;
  selfId: string;
  isHost: () => boolean;
  /** Chave do `localStorage` onde o anfitrião guarda o log (por jogo e sala). */
  storageKey: string;
  /** Eventos que começam uma nova rodada/partida: tudo antes deles deixa de importar. */
  resetEvents: string[];
  /** Eventos de jogo sincronizados; cada um aplica o estado local. */
  handlers: Record<string, SyncHandler>;
};

export type RoomSync = {
  /** Registra os handlers no canal; chame antes de `subscribe`. */
  attach: () => void;
  /** Aplica o evento ao log e o transmite. O estado local do emissor continua sendo aplicado por quem chama. */
  send: (event: string, payload?: unknown) => Promise<unknown>;
  /** Pede ao anfitrião o log da rodada (chame depois de inscrito). */
  request: () => Promise<unknown>;
  /** Anfitrião que recarregou: reaplica o log salvo. */
  restore: () => void;
  /** Esquece o log salvo (sala encerrada). */
  clear: () => void;
};

export const syncStorageKey = (game: string, room: string) => `alcateia-sync-${game}-${room}`;

export function createRoomSync({ channel, selfId, isHost, storageKey, resetEvents, handlers }: Options): RoomSync {
  let log: Entry[] = [];

  const persist = () => {
    if (!isHost()) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(log));
    } catch {
      /* sem armazenamento: só perde a recuperação após reload */
    }
  };
  const record = (entry: Entry) => {
    log = resetEvents.includes(entry.event) ? [entry] : [...log, entry];
    persist();
  };
  const emit = (event: string, payload: unknown) => channel.send({ type: "broadcast", event, payload });

  return {
    attach: () => {
      for (const [event, handler] of Object.entries(handlers)) {
        channel.on("broadcast", { event }, ({ payload }: { payload: unknown }) => {
          record({ event, payload });
          handler(payload, { replay: false });
        });
      }
      channel.on("broadcast", { event: "sync-request" }, ({ payload }: { payload: { from: string } }) => {
        if (isHost()) void emit("replay", { to: payload.from, log });
      });
      channel.on("broadcast", { event: "replay" }, ({ payload }: { payload: { to: string; log: Entry[] } }) => {
        if (payload.to !== selfId || payload.log.length === log.length) return;
        log = [];
        for (const entry of payload.log) {
          record(entry);
          handlers[entry.event]?.(entry.payload, { replay: true });
        }
      });
    },
    send: (event, payload = {}) => {
      record({ event, payload });
      return emit(event, payload);
    },
    request: () => emit("sync-request", { from: selfId }),
    restore: () => {
      if (log.length) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as Entry[];
        for (const entry of Array.isArray(saved) ? saved : []) {
          record(entry);
          handlers[entry.event]?.(entry.payload, { replay: true });
        }
      } catch {
        /* log salvo ilegível: segue sem ele */
      }
    },
    clear: () => {
      log = [];
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* nada a limpar */
      }
    },
  };
}
