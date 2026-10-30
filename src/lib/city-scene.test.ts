import { describe, expect, it } from 'vitest'
import { games } from '@/constants/games'
import { applyInertia, cameraFor, clampCamera, GROUND_Y, layoutLots, lotSpec } from './city-scene'

describe('city scene', () => {
  const { lots, worldW } = layoutLots()

  it('places one lot per street game, in order, without overlap', () => {
    expect(lots.map((lot) => lot.id)).toEqual(games.filter((game) => lotSpec[game.id]).map((game) => game.id))
    expect(lots.some((lot) => lot.id === 'reflexo')).toBe(false)
    lots.slice(1).forEach((lot, i) => expect(lot.x).toBeGreaterThanOrEqual(lots[i].x + lots[i].w))
    expect(lots.at(-1)!.x + lots.at(-1)!.w).toBeLessThan(worldW)
    lots.forEach((lot) => expect(lot.h).toBeLessThan(GROUND_Y))
  })

  it('keeps the camera inside the street', () => {
    expect(clampCamera(-50, 300, worldW)).toBe(0)
    expect(clampCamera(99999, 300, worldW)).toBe(worldW - 300)
    expect(clampCamera(120, 300, worldW)).toBe(120)
    expect(clampCamera(80, worldW + 100, worldW)).toBe(-50)
  })

  it('centers a focused lot when possible', () => {
    const lot = lots[5]
    expect(cameraFor(lot, 200, worldW)).toBe(lot.x + lot.w / 2 - 100)
    expect(cameraFor(lots[0], 200, worldW)).toBe(0)
  })

  it('decays drag velocity to zero', () => {
    let v = 1.5
    for (let i = 0; i < 200 && v !== 0; i++) v = applyInertia(v, 16)
    expect(v).toBe(0)
    expect(Math.abs(applyInertia(-1, 16))).toBeLessThan(1)
  })
})
