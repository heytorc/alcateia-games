import { useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { DoorOpen, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { gameButtonVariants } from '@/components/games/GameButton'
import { supabase } from '@/lib/realtime'
import { createClientId } from '@/lib/utils'
import type { RoomGame } from '@/lib/store'

type RoomListing = {
  pin: string
  hostName: string
  hostAvatar: string
  rounds?: number
}

type DirectoryPresence = RoomListing

type RoomDirectoryProps = {
  game: RoomGame
  isHosting: boolean
  hostName: string
  hostAvatar: string
  pin: string
  rounds?: number
  /** false: só anuncia a sala do anfitrião, sem renderizar a lista (uso dentro do lobby). */
  showList?: boolean
  /** Bloqueia a entrada pelos cards (ex.: perfil sem nome). */
  disabled?: boolean
  /** 'drawer': botão com contador (para o GameHeader) que abre a lista num drawer. */
  variant?: 'inline' | 'drawer'
  onJoin: (pin: string) => void
}

export function RoomDirectory({ game, isHosting, hostName, hostAvatar, pin, rounds, showList = true, disabled = false, variant = 'inline', onJoin }: RoomDirectoryProps) {
  const [rooms, setRooms] = useState<RoomListing[]>([])
  const [ready, setReady] = useState(false)
  const directoryId = useRef(createClientId())

  useEffect(() => {
    const client = supabase
    if (!client) return
    const channel: RealtimeChannel = client.channel(`rooms:${game}`, { config: { presence: { key: directoryId.current } } })
    const syncRooms = () => {
      const presence = channel.presenceState<DirectoryPresence>()
      const activeRooms = Object.values(presence).flat().filter((entry) => entry.pin)
      setRooms(activeRooms.filter((entry, index, entries) => entries.findIndex((roomEntry) => roomEntry.pin === entry.pin) === index))
    }

    channel
      .on('presence', { event: 'sync' }, syncRooms)
      .on('presence', { event: 'join' }, syncRooms)
      .on('presence', { event: 'leave' }, syncRooms)
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return
        if (isHosting && pin) {
          await channel.track({ pin, hostName, hostAvatar, rounds })
        }
        syncRooms()
        setReady(true)
      })

    return () => { void client.removeChannel(channel) }
  }, [game, hostAvatar, hostName, isHosting, pin, rounds])

  if (!showList || !supabase) return null

  const list = (
    <>
      {rooms.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/15 px-3 py-4 text-center text-xs text-[#aaa3c0]">
          {ready ? 'Nenhuma sala aberta agora. Crie a primeira!' : 'Procurando salas…'}
        </p>
      ) : (
        <ul className="grid max-h-[13.5rem] gap-2 overflow-y-auto overscroll-contain pr-1">
          {rooms.map((listedRoom) => (
            <li key={listedRoom.pin}>
              <button
                className="group flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-md border border-white/10 bg-[#150d33] p-2.5 text-left transition-colors hover:border-brand-accent hover:bg-[#312852] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={disabled}
                aria-label={`Entrar na sala de ${listedRoom.hostName}, código ${listedRoom.pin}`}
                onClick={() => onJoin(listedRoom.pin)}
              >
                <span className="text-2xl leading-none" aria-hidden="true">{listedRoom.hostAvatar}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[#f6f4ff]">{listedRoom.hostName}</span>
                  <span className="block truncate text-[11px] text-[#aaa3c0]">
                    Sala {listedRoom.pin}{listedRoom.rounds ? ` · ${listedRoom.rounds} rodadas` : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1 rounded border border-[#14e4f5]/60 bg-[#14e4f5]/10 px-2.5 py-1.5 font-game-pixel text-[10px] tracking-wider text-[#14e4f5] uppercase group-hover:bg-[#14e4f5]/20">
                  Entrar <DoorOpen size={14} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )

  if (variant === 'drawer') {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            aria-label={`Salas ativas: ${rooms.length}`}
            className={`${gameButtonVariants({ variant: 'special', size: 'icon' })} relative overflow-visible`}>
            <Users />
            <span className="absolute -top-2 -right-2 grid min-w-5 place-items-center rounded-md border-2 border-black bg-accent px-1 font-game-pixel text-[10px] leading-4 text-accent-foreground">
              {rooms.length}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent
          side="right"
          showCloseButton={false}
          className="w-[min(420px,100%)] gap-0 overflow-auto rounded-l-md border-2 border-[#4a34a8] bg-[#150d33] p-6 text-white shadow-[0_20px_70px_rgba(0,0,0,.4)]">
          <SheetHeader className="mb-5 p-0">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="font-game-pixel text-[16px] font-bold text-white">Salas ativas</SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" aria-label="Fechar" className={gameButtonVariants({ variant: 'special', size: 'icon' })}>
                  <X />
                </Button>
              </SheetClose>
            </div>
            <SheetDescription className="sr-only">Salas abertas para entrar.</SheetDescription>
          </SheetHeader>
          <div className="text-left">{list}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <section className="w-full text-left" aria-label="Salas ativas">
      <div className="mb-2 flex items-center justify-between text-[12px] font-extrabold tracking-wider text-brand-accent uppercase">
        <span className="flex items-center gap-2">
          <Users size={16} aria-hidden="true" />
          Salas ativas
        </span>
        <span aria-live="polite" className="text-[11px] text-[#aaa3c0]">
          {ready ? rooms.length : '…'}
        </span>
      </div>
      {list}
    </section>
  )
}
