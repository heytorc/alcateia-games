import { games, type GameId } from '@/constants/games'

/** Altura lógica da cena (px de pixel art); a largura visível depende do contêiner. */
export const SCENE_H = 180
/** Linha onde as fachadas tocam a calçada. */
export const GROUND_Y = 132
/** Espaço livre no começo e no fim da rua. */
export const STREET_PAD = 36
const LOT_GAP = 8

export type LotKind = 'biblioteca' | 'mercearia' | 'loteria' | 'torre' | 'bar' | 'tvs' | 'terreno' | 'boate' | 'mural' | 'cassino'

/**
 * Como cada jogo aparece na rua: tipo de lote, largura, altura da área clicável e letreiro.
 * `null` deixa o jogo fora da rua (ele continua na grade de cards).
 */
export const lotSpec: Record<GameId, { kind: LotKind; w: number; h: number; sign: string } | null> = {
  letters: { kind: 'biblioteca', w: 84, h: 78, sign: 'BIBLIOTECA' },
  weight: { kind: 'mercearia', w: 76, h: 92, sign: 'PESO' },
  number: { kind: 'loteria', w: 82, h: 96, sign: 'LOTERIA' },
  time: { kind: 'torre', w: 46, h: 124, sign: 'TEMPO' },
  impostor: { kind: 'bar', w: 84, h: 88, sign: 'BAR' },
  password: { kind: 'tvs', w: 80, h: 88, sign: 'TV' },
  'campo-minado': { kind: 'terreno', w: 84, h: 52, sign: 'PERIGO' },
  reflexo: null,
  proibidas: { kind: 'boate', w: 86, h: 104, sign: 'BOATE' },
  provavel: { kind: 'mural', w: 50, h: 44, sign: 'AVISOS' },
  ordem: { kind: 'cassino', w: 108, h: 122, sign: 'CASSINO' },
}

export type Lot = { id: GameId; title: string; description: string; color: string; x: number; w: number; h: number; kind: LotKind; sign: string }

/** Posiciona os lotes na ordem de `games` (a mesma dos cards da Home), pulando os jogos fora da rua. */
export function layoutLots(): { lots: Lot[]; worldW: number } {
  let x = STREET_PAD
  const lots = games.flatMap((game) => {
    const spec = lotSpec[game.id]
    if (!spec) return []
    const lot = { ...game, ...spec, x }
    x += spec.w + LOT_GAP
    return [lot]
  })
  return { lots, worldW: x - LOT_GAP + STREET_PAD }
}

/** Mantém a câmera dentro da rua; se a rua couber inteira, centraliza. */
export function clampCamera(x: number, viewW: number, worldW: number) {
  if (worldW <= viewW) return (worldW - viewW) / 2
  return Math.min(Math.max(x, 0), worldW - viewW)
}

/** Câmera que centraliza o lote (usada ao focar um alvo pelo teclado). */
export function cameraFor(lot: Pick<Lot, 'x' | 'w'>, viewW: number, worldW: number) {
  return clampCamera(lot.x + lot.w / 2 - viewW / 2, viewW, worldW)
}

/** Desacelera a velocidade (px/ms) do arrasto solto; zera abaixo do limiar. */
export function applyInertia(v: number, dt: number) {
  const next = v * Math.pow(0.94, dt / 16)
  return Math.abs(next) < 0.005 ? 0 : next
}
