import { describe, expect, it } from 'vitest'
import { applyClick, createMatch, currentPlayerId, forfeit } from './campo-minado-rules'

const IDS = ['a', 'b', 'c']
// células: 0 e 1 são bombas, o resto é seguro
const bombs = { 0: ['a'], 1: ['b'] }
const make = (cells = 6, ids = IDS, lives = 2) => createMatch(1, cells, lives, bombs, ids)

describe('campo minado: turnos e rodadas', () => {
  it('ignora cliques fora da vez e em casas já abertas', () => {
    const m = make()
    const other = IDS.find((id) => id !== currentPlayerId(m))!
    expect(applyClick(m, 2, other)).toBe(m)
    const after = applyClick(m, 2, currentPlayerId(m)!)
    expect(applyClick(after, 2, currentPlayerId(after)!)).toBe(after)
  })

  it('passa a vez e abre nova rodada depois que todos jogam', () => {
    let m = make(20)
    const first = m.order
    for (const cell of [2, 3, 4]) m = applyClick(m, cell, currentPlayerId(m)!)
    expect(m.round).toBe(2)
    expect(m.turn).toBe(0)
    expect([...m.order].sort()).toEqual(IDS)
    expect(first).toHaveLength(3)
  })

  it('bomba tira uma vida e elimina quem chega a zero, pulando-o na rodada seguinte', () => {
    let m = make(20, IDS, 1)
    m = applyClick(m, 0, currentPlayerId(m)!)
    const eliminated = Object.keys(m.lives).find((id) => m.lives[id] === 0)!
    expect(m.statuses[0]).toBe('EXPLODED')
    for (let i = 0; i < 2; i++) m = applyClick(m, 5 + i, currentPlayerId(m)!)
    expect(m.round).toBe(2)
    expect(m.order).not.toContain(eliminated)
  })

  it('termina quando resta um único jogador vivo', () => {
    let m = make(20, ['a', 'b'], 1)
    m = applyClick(m, 0, currentPlayerId(m)!)
    expect(m.result?.winnerIds).toHaveLength(1)
    expect(m.result?.winnerIds[0]).not.toBe(Object.keys(m.lives).find((id) => m.lives[id] === 0))
  })

  it('sem casas seguras, vence quem tem mais vidas e empata se iguais', () => {
    // 4 casas, 2 bombas: duas seguras (2 e 3)
    let m = make(4, ['a', 'b'], 3)
    m = applyClick(m, 2, currentPlayerId(m)!)
    m = applyClick(m, 3, currentPlayerId(m)!)
    expect(m.result?.winnerIds.sort()).toEqual(['a', 'b'])

    m = make(4, ['a', 'b'], 3)
    m = applyClick(m, 0, currentPlayerId(m)!)
    m = applyClick(m, 2, currentPlayerId(m)!)
    m = applyClick(m, 3, currentPlayerId(m)!)
    expect(m.result?.winnerIds).toHaveLength(1)
  })

  it('forfeit elimina o ausente e passa a vez', () => {
    const m = make(20)
    const gone = currentPlayerId(m)!
    const after = forfeit(m, gone)
    expect(after.lives[gone]).toBe(0)
    expect(currentPlayerId(after)).not.toBe(gone)
  })
})
