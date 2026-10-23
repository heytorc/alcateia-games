import { describe, expect, it } from 'vitest'
import { createClientId, drawManyUnique, drawUnique, drawUniqueInteger, formatStopwatch, formatWeight, numberRange, seededShuffle } from './utils'
import { megaPasswordWords } from '@/constants/password-words'

describe('game utilities', () => {
  it('draws an unused item when repeats are disabled', () => {
    expect(drawUnique(['A', 'B'], ['A'], false)).toBe('B')
  })

  it('falls back to the full pool when every item was used', () => {
    expect(['A', 'B']).toContain(drawUnique(['A', 'B'], ['A', 'B'], false))
  })

  it('draws an unused integer and reports an exhausted range', () => {
    expect(drawUniqueInteger(1, 3, [1, 2])).toBe(3)
    expect(drawUniqueInteger(1, 2, [1, 2])).toBeNull()
  })

  it('shuffles deterministically for the same seed without losing items', () => {
    const items = [1, 2, 3, 4, 5, 6]
    expect(seededShuffle(items, 42)).toEqual(seededShuffle(items, 42))
    expect([...seededShuffle(items, 7)].sort()).toEqual(items)
  })

  it('draws a round without duplicated words', () => {
    const words = drawManyUnique(['PRAIA', 'PONTE', 'MUSEU', 'PARQUE'], 4)
    expect(new Set(words)).toHaveLength(4)
  })

  it('provides more than 1,000 unique Mega senha words', () => {
    expect(megaPasswordWords.length).toBeGreaterThan(1000)
    expect(new Set(megaPasswordWords)).toHaveLength(megaPasswordWords.length)
  })

  it('formats weights using the selected unit', () => {
    expect(formatWeight(5000, 'kg')).toBe('5 kg')
    expect(formatWeight(250, 'g')).toBe('250 g')
  })

  it('creates integer ranges based on digit count', () => {
    expect(numberRange(1)).toEqual([0, 9])
    expect(numberRange(4)).toEqual([1000, 9999])
  })

  it('formats the stopwatch as minutes, seconds, and hundredths', () => {
    expect(formatStopwatch(62_349)).toBe('01:02:34')
  })

  it('creates distinct identifiers for realtime players', () => {
    expect(createClientId()).not.toBe(createClientId())
  })
})
