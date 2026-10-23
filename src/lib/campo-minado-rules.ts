import { seededShuffle } from '@/lib/utils'

export type CellStatus = 'HIDDEN' | 'REVEALED' | 'EXPLODED'

export interface Match {
  seed: number
  totalCells: number
  maxLives: number
  bombMap: Record<number, string[]>
  statuses: Record<number, CellStatus>
  lives: Record<string, number>
  /** Jogadores vivos no início da rodada, na ordem de jogo. */
  order: string[]
  /** Índice em `order` de quem joga agora. */
  turn: number
  round: number
  /** `null` enquanto a partida corre; vários ids = empate; nenhum = ninguém sobreviveu. */
  result: { winnerIds: string[] } | null
}

const alive = (lives: Record<string, number>) =>
  Object.keys(lives).filter((id) => lives[id] > 0).sort()

const roundOrder = (seed: number, round: number, lives: Record<string, number>) =>
  seededShuffle(alive(lives), seed + round)

export function createMatch(
  seed: number,
  totalCells: number,
  maxLives: number,
  bombMap: Record<number, string[]>,
  playerIds: string[],
): Match {
  const lives = Object.fromEntries(playerIds.map((id) => [id, maxLives]))
  return {
    seed, totalCells, maxLives, bombMap, lives,
    statuses: {},
    order: roundOrder(seed, 1, lives),
    turn: 0,
    round: 1,
    result: null,
  }
}

export const currentPlayerId = (m: Match) => (m.result ? null : m.order[m.turn] ?? null)

function getResult(m: Match): Match['result'] {
  const survivors = alive(m.lives)
  if (survivors.length === 0) return { winnerIds: [] }
  if (survivors.length === 1 && Object.keys(m.lives).length > 1) return { winnerIds: survivors }

  const bombs = Object.keys(m.bombMap).length
  const revealed = Object.values(m.statuses).filter((s) => s === 'REVEALED').length
  if (revealed < m.totalCells - bombs) return null

  const best = Math.max(...survivors.map((id) => m.lives[id]))
  return { winnerIds: survivors.filter((id) => m.lives[id] === best) }
}

function advance(m: Match): Match {
  const result = getResult(m)
  if (result) return { ...m, result }

  const next = m.order.findIndex((id, i) => i > m.turn && m.lives[id] > 0)
  if (next !== -1) return { ...m, turn: next }

  const round = m.round + 1
  return { ...m, round, order: roundOrder(m.seed, round, m.lives), turn: 0 }
}

export function applyClick(m: Match, cell: number, playerId: string): Match {
  if (currentPlayerId(m) !== playerId) return m
  if (cell < 0 || cell >= m.totalCells || (m.statuses[cell] ?? 'HIDDEN') !== 'HIDDEN') return m

  const exploded = Boolean(m.bombMap[cell])
  return advance({
    ...m,
    statuses: { ...m.statuses, [cell]: exploded ? 'EXPLODED' : 'REVEALED' },
    lives: exploded ? { ...m.lives, [playerId]: m.lives[playerId] - 1 } : m.lives,
  })
}

/** Jogador saiu da sala: sai da partida; se era a vez dele, passa a vez. */
export function forfeit(m: Match, playerId: string): Match {
  if (m.result || !(m.lives[playerId] > 0)) return m
  const wasTurn = currentPlayerId(m) === playerId
  const next = { ...m, lives: { ...m.lives, [playerId]: 0 } }
  if (wasTurn) return advance(next)
  const result = getResult(next)
  return result ? { ...next, result } : next
}
