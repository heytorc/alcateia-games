export { cn } from "cn"

export function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function drawManyUnique<T>(items: readonly T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

export function randomInteger(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function drawUniqueInteger(min: number, max: number, used: readonly number[]): number | null {
  const usedValues = new Set(used.filter((value) => value >= min && value <= max))
  if (usedValues.size >= max - min + 1) return null

  for (let attempt = 0; attempt < 32; attempt += 1) {
    const value = randomInteger(min, max)
    if (!usedValues.has(value)) return value
  }

  for (let value = min; value <= max; value += 1) {
    if (!usedValues.has(value)) return value
  }

  return null
}

export function drawUnique<T>(items: T[], used: T[], allowRepeats: boolean): T {
  const available = allowRepeats ? items : items.filter((item) => !used.includes(item))
  return randomItem(available.length > 0 ? available : items)
}

export function formatWeight(grams: number, preferredUnit: 'g' | 'kg'): string {
  if (preferredUnit === 'kg') return `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 2)} kg`
  return `${grams} g`
}

export function numberRange(digits: number): [number, number] {
  if (digits <= 1) return [0, 9]
  return [10 ** (digits - 1), (10 ** digits) - 1]
}

export function formatStopwatch(milliseconds: number): string {
  const totalMilliseconds = Math.max(0, Math.floor(milliseconds))
  const minutes = Math.floor(totalMilliseconds / 60_000)
  const seconds = Math.floor((totalMilliseconds % 60_000) / 1_000)
  const hundredths = Math.floor((totalMilliseconds % 1_000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(hundredths).padStart(2, '0')}`
}

export function createClientId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const values = crypto.getRandomValues(new Uint32Array(4))
    return Array.from(values, (value) => value.toString(16)).join('-')
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

/** Embaralhamento reproduzível: a mesma semente gera a mesma ordem em todos os clientes. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  let state = seed >>> 0
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** PIN de sala com 4 dígitos (1000–9999). */
export function createRoomPin(): string {
  return randomInteger(1000, 9999).toString()
}
