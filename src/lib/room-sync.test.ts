import { describe, expect, it, vi } from "vitest";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createRoomSync } from "./room-sync";

type Listener = (message: { payload: unknown }) => void;

/** Canal falso: entrega o broadcast aos listeners de todos os outros pares (sem eco ao emissor). */
function makeRoom() {
  const peers: Array<{ listeners: Map<string, Listener[]> }> = [];
  const makeChannel = () => {
    const self = { listeners: new Map<string, Listener[]>() };
    peers.push(self);
    return {
      on: (_type: string, filter: { event: string }, listener: Listener) => {
        self.listeners.set(filter.event, [...(self.listeners.get(filter.event) ?? []), listener]);
      },
      send: async ({ event, payload }: { event: string; payload: unknown }) => {
        for (const peer of peers) if (peer !== self) peer.listeners.get(event)?.forEach((fn) => fn({ payload }));
      },
    } as unknown as RealtimeChannel;
  };
  return makeChannel;
}

describe("createRoomSync", () => {
  it("o jogador que perdeu eventos adota o log do anfitrião", async () => {
    const makeChannel = makeRoom();
    const hostState: string[] = [];
    const guestState: string[] = [];
    const common = { resetEvents: ["round-start"] };
    const host = createRoomSync({
      ...common,
      channel: makeChannel(),
      selfId: "host",
      isHost: () => true,
      storageKey: "k-host",
      handlers: { "round-start": () => hostState.push("start"), podium: () => hostState.push("podium") },
    });
    host.attach();
    await host.send("round-start", { round: 1 });
    await host.send("podium", {}); // o convidado ainda não está conectado: perde os dois
    const guest = createRoomSync({
      ...common,
      channel: makeChannel(),
      selfId: "guest",
      isHost: () => false,
      storageKey: "k-guest",
      handlers: { "round-start": () => guestState.push("start"), podium: () => guestState.push("podium") },
    });
    guest.attach();

    await guest.request();
    expect(guestState).toEqual(["start", "podium"]);

    await guest.request(); // já em dia: não reaplica nada
    expect(guestState).toEqual(["start", "podium"]);
  });

  it("evento de reinício descarta o log anterior", async () => {
    const makeChannel = makeRoom();
    const applied = vi.fn();
    const host = createRoomSync({
      channel: makeChannel(),
      selfId: "host",
      isHost: () => true,
      storageKey: "k-host2",
      resetEvents: ["round-start"],
      handlers: { "round-start": applied, score: applied },
    });
    host.attach();
    await host.send("round-start", { round: 1 });
    await host.send("score", {});
    await host.send("round-start", { round: 2 });
    const guest = createRoomSync({
      channel: makeChannel(),
      selfId: "guest",
      isHost: () => false,
      storageKey: "k-guest2",
      resetEvents: ["round-start"],
      handlers: { "round-start": applied, score: applied },
    });
    guest.attach();
    await guest.request();
    expect(applied).toHaveBeenCalledTimes(1);
    expect(applied).toHaveBeenCalledWith({ round: 2 });
  });
});
