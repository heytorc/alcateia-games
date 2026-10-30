import { GROUND_Y as G, SCENE_H as H, type Lot } from '@/lib/city-scene'

/** Pixel art procedural da rua: camadas estáticas pré-renderizadas + detalhes animados por frame. */

const BG = '#0a0618'
const FAR_TILE = 320
const MID_TILE = 420
const STAR_TILE = 640
const FONT = '8px Silkscreen, monospace'
const NEON = ['#ff2e93', '#14e4f5', '#ffe14a', '#a29bfe', '#00b894', '#ff9f43']
const BILLBOARDS = ['VHS', 'DISCO', 'PIZZA', 'ARCADE', 'HOTEL', 'RADIO']

export type CityLayers = {
  far: HTMLCanvasElement
  mid: HTMLCanvasElement
  world: HTMLCanvasElement
  signs: HTMLCanvasElement
  worldW: number
  stars: Array<{ x: number; y: number; big: boolean; phase: number }>
  manholes: number[]
}

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${[16, 8, 0].map((shift) => ch(shift).toString(16).padStart(2, '0')).join('')}`
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

type Ctx = CanvasRenderingContext2D

function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h))
}

function circle(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

function bitmap(ctx: Ctx, rows: string[], x: number, y: number, color: string) {
  ctx.fillStyle = color
  rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && ctx.fillRect(x + i, y + j, 1, 1)))
}

function glow<T>(ctx: Ctx, color: string, blur: number, draw: () => T) {
  ctx.save()
  ctx.shadowColor = color
  ctx.shadowBlur = blur
  const out = draw()
  ctx.restore()
  return out
}

const SUITS = {
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
  spade: ['..#..', '.###.', '#####', '..#..', '.###.'],
  club: ['.###.', '.###.', '#####', '..#..', '.###.'],
}

/** Prédios do horizonte: silhuetas com janelas (e outdoors neon), repetidos em ladrilho. */
function skyline(width: number, seed: number, base: string, minH: number, maxH: number, lit: number, billboards: boolean) {
  const c = canvas(width, H)
  const ctx = c.getContext('2d')!
  const rnd = rng(seed)
  let x = -4
  let board = 0
  while (x < width) {
    const w = 18 + Math.floor(rnd() * 26)
    const h = minH + Math.floor(rnd() * (maxH - minH))
    const top = G - h
    rect(ctx, x, top, w, h, base)
    rect(ctx, x, top, w, 1, mix(base, '#6b3cff', 0.25))
    if (rnd() < 0.35) {
      rect(ctx, x + w / 2, top - 8, 1, 8, base)
      if (billboards) rect(ctx, x + w / 2, top - 9, 1, 1, '#ff3b3b')
    }
    if (rnd() < 0.25) rect(ctx, x + 3, top - 5, 7, 5, base)
    for (let wy = top + 5; wy < G - 6; wy += 6)
      for (let wx = x + 3; wx < x + w - 3; wx += 4)
        if (rnd() < lit) rect(ctx, wx, wy, 2, 2, rnd() < 0.7 ? 'rgba(255,207,106,.75)' : 'rgba(20,228,245,.6)')
    if (billboards && w > 28 && rnd() < 0.45) {
      const text = BILLBOARDS[board++ % BILLBOARDS.length]
      const color = NEON[Math.floor(rnd() * NEON.length)]
      rect(ctx, x + 4, top - 2, 1, 2, '#0b0716')
      rect(ctx, x + w - 6, top - 2, 1, 2, '#0b0716')
      neonSign(ctx, text, x + w / 2, top - 13, color)
    }
    x += w + Math.floor(rnd() * 4)
  }
  return c
}

/** Corpo do prédio com janelas, caixa d'água/antena, ar-condicionado, escada de incêndio e pichação. */
function tower(ctx: Ctx, rnd: () => number, lot: Lot, h = lot.h) {
  const { x, w, color } = lot
  const top = G - h
  rect(ctx, x, top, w, h, mix(color, BG, 0.84))
  rect(ctx, x + w - 4, top, 4, h, mix(color, BG, 0.92))
  rect(ctx, x - 2, top - 3, w + 4, 3, mix(color, BG, 0.65))
  rect(ctx, x - 2, top - 3, w + 4, 1, mix(color, '#ffffff', 0.1))
  if (rnd() < 0.55) {
    const tx = x + 6 + Math.floor(rnd() * (w - 24))
    rect(ctx, tx + 1, top - 6, 1, 3, '#1a1030')
    rect(ctx, tx + 8, top - 6, 1, 3, '#1a1030')
    rect(ctx, tx, top - 14, 10, 8, '#2a1a3a')
    rect(ctx, tx + 1, top - 16, 8, 2, '#2a1a3a')
    for (let i = 0; i < 3; i++) rect(ctx, tx, top - 12 + i * 3, 10, 1, '#1d1230')
  } else {
    const ax = x + w - 12
    rect(ctx, ax, top - 14, 1, 11, '#2a1a3a')
    rect(ctx, ax - 3, top - 11, 7, 1, '#2a1a3a')
    rect(ctx, ax - 2, top - 8, 5, 1, '#2a1a3a')
    rect(ctx, ax, top - 15, 1, 1, '#ff3b3b')
  }
  const floors: number[] = []
  for (let wy = top + 7; wy < G - 44; wy += 11) {
    floors.push(wy)
    for (let wx = x + 6; wx < x + w - 10; wx += 10) {
      const on = rnd() < 0.45
      rect(ctx, wx, wy, 6, 7, on ? (rnd() < 0.75 ? '#ffd27a' : mix(color, '#ffffff', 0.4)) : '#0d0820')
      rect(ctx, wx, wy + 3, 6, 1, on ? 'rgba(0,0,0,.25)' : '#1b1236')
      if (on && rnd() < 0.12) {
        rect(ctx, wx + 2, wy + 2, 2, 2, '#1a0f2a')
        rect(ctx, wx + 1, wy + 4, 4, 3, '#1a0f2a')
      }
      if (rnd() < 0.12) {
        rect(ctx, wx, wy + 8, 6, 3, '#3a2f55')
        rect(ctx, wx + 1, wy + 9, 4, 1, '#251c3c')
      }
    }
  }
  if (w >= 76 && rnd() < 0.5) {
    for (const wy of floors) {
      rect(ctx, x + 2, wy + 8, 18, 1, '#4a3a6e')
      rect(ctx, x + 2, wy + 5, 1, 3, '#4a3a6e')
      rect(ctx, x + 19, wy + 5, 1, 3, '#4a3a6e')
      for (let i = 0; i < 10; i++) rect(ctx, x + 6 + i, wy + 9 + i, 1, 1, '#3a2c55')
    }
  }
  if (rnd() < 0.5) {
    const gc = NEON[Math.floor(rnd() * NEON.length)]
    const gx = x + 3 + Math.floor(rnd() * 8)
    for (let i = 0; i < 9; i++) rect(ctx, gx + i, G - 40 + Math.round(Math.sin(i * 1.7) * 2), 1, 2, gc)
  }
}

function storefront(ctx: Ctx, lot: Lot, doorAt: 'left' | 'right' | 'center' = 'right') {
  const { x, w, color } = lot
  rect(ctx, x, G - 34, w - 4, 34, mix(color, BG, 0.9))
  const doorX = doorAt === 'left' ? x + 5 : doorAt === 'center' ? x + w / 2 - 7 : x + w - 18
  rect(ctx, doorX, G - 22, 11, 22, '#07040f')
  rect(ctx, doorX + 8, G - 12, 1, 2, color)
  const winX = doorAt === 'left' ? doorX + 15 : x + 5
  const winW = doorAt === 'center' ? doorX - x - 9 : w - 32
  const win = (wx: number) => {
    rect(ctx, wx, G - 26, winW, 18, mix(color, BG, 0.7))
    rect(ctx, wx, G - 26, winW, 1, color)
  }
  win(winX)
  if (doorAt === 'center') win(doorX + 15)
  return { winX, winW, doorX }
}

/** Escreve `text` com o centro óptico das letras (não da caixa da fonte) na altura `cy`. */
function textAt(ctx: Ctx, text: string, x: number, cy: number) {
  ctx.font = FONT
  ctx.textBaseline = 'alphabetic'
  const m = ctx.measureText(text)
  ctx.fillText(text, x, Math.round(cy + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2))
}

/** Letreiro neon com placa escura atrás (vai na camada `signs`, que pisca por lote). */
function neonSign(ctx: Ctx, text: string, cx: number, y: number, color: string, box = true) {
  ctx.font = FONT
  const tw = Math.ceil(ctx.measureText(text).width)
  const x = Math.round(cx - tw / 2)
  if (box) rect(ctx, x - 4, y - 3, tw + 8, 13, '#07040f')
  glow(ctx, color, 6, () => {
    if (box) {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.strokeRect(x - 3.5, y - 2.5, tw + 7, 12)
    }
    ctx.fillStyle = mix(color, '#ffffff', 0.55)
    textAt(ctx, text, x, y + 3.5)
  })
  return { x, w: tw }
}

/** Letras empilhadas numa placa vertical (cassino). */
function bladeSign(ctx: Ctx, text: string, x: number, y: number, color: string) {
  ctx.font = FONT
  const h = text.length * 8 + 4
  rect(ctx, x, y, 11, h, '#07040f')
  glow(ctx, color, 6, () => {
    ctx.strokeStyle = color
    ctx.strokeRect(x + 0.5, y + 0.5, 10, h - 1)
    ctx.fillStyle = mix(color, '#ffffff', 0.55)
    ;[...text].forEach((ch, i) => textAt(ctx, ch, x + 6 - Math.ceil(ctx.measureText(ch).width / 2), y + 6 + i * 8))
  })
}

type Paper = { x: number; y: number; w: number; h: number; color: string; torn?: boolean; tabs?: boolean }

const MURAL_PAPERS: Paper[] = [
  { x: 1, y: 1, w: 7, h: 8, color: '#f4efe0' },
  { x: 9, y: 1, w: 6, h: 5, color: '#ffe9a0' },
  { x: 16, y: 2, w: 7, h: 7, color: '#ffc2dd', torn: true },
  { x: 31, y: 1, w: 7, h: 6, color: '#bfefff' },
  { x: 1, y: 10, w: 6, h: 6, color: '#d8f5c0', torn: true },
  { x: 9, y: 7, w: 8, h: 9, color: '#f4efe0', tabs: true },
  { x: 19, y: 10, w: 6, h: 6, color: '#ffe9a0' },
]

/** Um aviso no quadro: linhas de texto, tachinha e, opcionalmente, canto rasgado ou tiras de destacar. */
function notice(ctx: Ctx, px: number, py: number, paper: Paper, rnd: () => number) {
  const { w, h, color } = paper
  rect(ctx, px + 1, py + 1, w, h, 'rgba(0,0,0,.3)')
  rect(ctx, px, py, w, h, color)
  const body = paper.tabs ? h - 3 : h
  for (let ly = py + 2; ly < py + body - 1; ly += 2) rect(ctx, px + 1, ly, Math.max(2, w - 2 - Math.floor(rnd() * 3)), 1, '#9a8f80')
  if (paper.tabs) {
    rect(ctx, px, py + h - 3, w, 1, '#c8bfae')
    for (let tx = px + 1; tx < px + w; tx += 2) rect(ctx, tx, py + h - 2, 1, 2, '#8a5a2e')
    rect(ctx, px + 4, py + h - 2, 2, 2, '#8a5a2e')
  }
  if (paper.torn) for (let i = 0; i < 3; i++) rect(ctx, px + w - 3 + i, py + h - 1 - i, 3 - i, 1 + i, '#8a5a2e')
  rect(ctx, px + Math.floor(w / 2), py + 1, 1, 1, ['#ff3b3b', '#14e4f5', '#ffe14a'][Math.floor(rnd() * 3)])
}

function drawLot(ctx: Ctx, sg: Ctx, lot: Lot, rnd: () => number) {
  const { x, w, h, color, sign } = lot
  const cx = x + w / 2
  switch (lot.kind) {
    case 'biblioteca': {
      // biblioteca: frontão, colunas, janelas com estantes iluminadas, porta central e escadaria
      const stone = '#2e2746'
      const light = '#4a4068'
      rect(ctx, x + 2, G - 62, w - 4, 62, stone)
      ctx.fillStyle = light
      ctx.beginPath()
      ctx.moveTo(x - 1, G - 62)
      ctx.lineTo(cx, G - 77)
      ctx.lineTo(x + w + 1, G - 62)
      ctx.fill()
      ctx.fillStyle = stone
      ctx.beginPath()
      ctx.moveTo(x + 7, G - 64)
      ctx.lineTo(cx, G - 73)
      ctx.lineTo(x + w - 7, G - 64)
      ctx.fill()
      rect(ctx, x - 1, G - 62, w + 2, 3, light)
      rect(ctx, x + 1, G - 46, w - 2, 2, light)
      ;[x + 6, x + 22, x + w - 26, x + w - 10].forEach((colX) => {
        rect(ctx, colX - 1, G - 44, 6, 2, light)
        rect(ctx, colX, G - 42, 4, 36, '#5a5080')
        rect(ctx, colX + 3, G - 42, 1, 36, '#3e3560')
        rect(ctx, colX - 1, G - 7, 6, 1, light)
      })
      ;[x + 11, x + w - 21].forEach((wx) => {
        rect(ctx, wx, G - 38, 10, 26, '#ffcf6a')
        for (let row = 0; row < 4; row++) {
          rect(ctx, wx, G - 31 + row * 6, 10, 1, '#5a3418')
          for (let bx = 0; bx < 10; bx += 2) rect(ctx, wx + bx, G - 36 + row * 6, 1, 5, NEON[Math.floor(rnd() * NEON.length)])
        }
        rect(ctx, wx + 4, G - 38, 1, 26, '#5a3418')
      })
      rect(ctx, cx - 7, G - 26, 14, 20, '#140c08')
      circle(ctx, cx, G - 26, 7, '#140c08')
      rect(ctx, cx - 5, G - 24, 10, 18, '#3a2410')
      rect(ctx, cx, G - 24, 1, 18, '#1a0f08')
      rect(ctx, x, G - 6, w, 2, light)
      rect(ctx, x + 2, G - 4, w - 4, 2, '#3e3560')
      rect(ctx, x + 4, G - 2, w - 8, 2, light)
      neonSign(sg, sign, cx, G - 56, color)
      break
    }
    case 'mercearia': {
      tower(ctx, rnd, lot)
      storefront(ctx, lot, 'center')
      for (let i = 0; i < w - 2; i += 6) rect(ctx, x + 1 + i, G - 40, 6, 6, i % 12 ? '#f0e6ff' : color)
      for (let i = 0; i < w - 2; i += 6) rect(ctx, x + 2 + i, G - 34, 4, 2, i % 12 ? '#f0e6ff' : color)
      ;[x + 4, x + w - 18].forEach((bx) => {
        rect(ctx, bx, G - 7, 12, 7, '#6b4226')
        for (let i = 0; i < 4; i++) rect(ctx, bx + 1 + i * 3, G - 9, 2, 2, ['#ff6b6b', '#ff9f43', '#2ecc71', '#ffe14a'][i])
      })
      const s = neonSign(sg, sign, cx + 5, G - 54, color)
      glow(sg, color, 5, () => {
        rect(sg, s.x - 15, G - 52, 7, 1, color)
        rect(sg, s.x - 12, G - 55, 1, 7, color)
        rect(sg, s.x - 15, G - 51, 2, 2, color)
        rect(sg, s.x - 10, G - 51, 2, 2, color)
      })
      break
    }
    case 'loteria': {
      // lotérica: fachada azul com faixa laranja, painel de dezenas e globo de bolinhas
      tower(ctx, rnd, lot)
      rect(ctx, x, G - 40, w - 4, 40, '#123a8a')
      rect(ctx, x, G - 40, w - 4, 4, '#ff8a00')
      rect(ctx, x, G - 6, w - 4, 6, '#0b2560')
      rect(ctx, x + 5, G - 31, 30, 23, '#07040f')
      circle(ctx, x + 20, G - 20, 9, 'rgba(160,220,255,.25)')
      for (let i = 0; i < 9; i++) circle(ctx, x + 14 + (i % 3) * 5, G - 24 + Math.floor(i / 3) * 4, 1.5, NEON[i % NEON.length])
      rect(ctx, x + 19, G - 11, 2, 3, '#4a3a6e')
      rect(ctx, x + w - 22, G - 26, 12, 26, '#07040f')
      rect(ctx, x + w - 13, G - 14, 1, 2, '#ffe14a')
      rect(ctx, x + 38, G - 31, 22, 13, '#07040f')
      neonSign(sg, sign, cx - 2, G - 52, '#ffe14a')
      break
    }
    case 'torre': {
      // torre do relógio: corpo de pedra, mostrador com a hora real (ponteiros por frame) e agulha no topo
      const bodyX = x + 8
      rect(ctx, bodyX, G - 100, 30, 100, '#2c2238')
      rect(ctx, bodyX + 27, G - 100, 3, 100, '#211a2c')
      for (let y = G - 96; y < G; y += 6) rect(ctx, bodyX, y, 27, 1, '#241c30')
      rect(ctx, x + 4, G - 106, 38, 32, '#3a2e4a')
      rect(ctx, x + 4, G - 106, 38, 2, '#4e4064')
      rect(ctx, x + 4, G - 76, 38, 2, '#4e4064')
      ctx.fillStyle = '#1c1430'
      ctx.beginPath()
      ctx.moveTo(x + 2, G - 106)
      ctx.lineTo(cx, G - 124)
      ctx.lineTo(x + w - 2, G - 106)
      ctx.fill()
      rect(ctx, cx, G - 128, 1, 4, '#4e4064')
      glow(ctx, '#fff0c8', 8, () => circle(ctx, cx, G - 90, 13, '#d4af37'))
      circle(ctx, cx, G - 90, 11, '#fff3d6')
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2
        rect(ctx, Math.round(cx + Math.sin(a) * 9), Math.round(G - 90 - Math.cos(a) * 9), 1, 1, '#2a1a40')
      }
      ;[G - 66, G - 48].forEach((wy) => rect(ctx, cx - 1, wy, 3, 7, '#ffcf6a'))
      rect(ctx, cx - 5, G - 16, 10, 16, '#140c08')
      circle(ctx, cx, G - 16, 5, '#140c08')
      rect(ctx, cx - 3, G - 14, 6, 14, '#3a2410')
      neonSign(sg, sign, cx, G - 34, color)
      break
    }
    case 'bar': {
      // bar à esquerda; à direita, parede de tijolos onde o vulto encosta (desenhado por frame)
      const barW = 62
      tower(ctx, rnd, { ...lot, w: barW })
      rect(ctx, x, G - 34, barW - 4, 34, mix(color, BG, 0.9))
      rect(ctx, x + 5, G - 26, 26, 14, '#2a0a10')
      rect(ctx, x + 5, G - 26, 26, 1, color)
      for (let i = 0; i < 4; i++) rect(ctx, x + 8 + i * 6, G - 16, 2, 4, ['#5a2a10', '#2c5a40', '#5a2a10', '#7a1a2a'][i])
      rect(ctx, x + barW - 22, G - 22, 12, 22, '#120408')
      circle(ctx, x + barW - 16, G - 17, 3, '#ffcf6a')
      const wx = x + barW
      rect(ctx, wx, G - h, w - barW, h, '#120a1c')
      for (let y = G - h; y < G; y += 4)
        for (let bx = wx + ((y / 4) % 2 ? 0 : 3); bx < x + w; bx += 6) rect(ctx, bx, y, 5, 3, '#1c0f26')
      const spill = ctx.createRadialGradient(wx + 6, G - 34, 0, wx + 6, G - 34, 32)
      spill.addColorStop(0, 'rgba(214,48,49,.28)')
      spill.addColorStop(1, 'rgba(214,48,49,0)')
      ctx.fillStyle = spill
      ctx.fillRect(wx, G - 70, w - barW, 70)
      rect(ctx, x + w - 10, G - 12, 8, 12, '#2a1a3a')
      rect(ctx, x + w - 11, G - 13, 10, 1, '#3a2a4a')
      neonSign(sg, sign, x + 22, G - 44, color)
      break
    }
    case 'tvs': {
      tower(ctx, rnd, lot)
      rect(ctx, x, G - 34, w - 4, 34, mix(color, BG, 0.9))
      rect(ctx, x + 4, G - 30, w - 12, 24, '#07040f')
      rect(ctx, x + 4, G - 30, w - 12, 1, color)
      for (let i = 0; i < 4; i++) {
        const tx = x + 7 + i * 16
        rect(ctx, tx, G - 25, 14, 12, '#3a2c55')
        rect(ctx, tx + 4, G - 13, 6, 2, '#3a2c55')
      }
      rect(ctx, x + w - 14, G - 6, 8, 6, '#07040f')
      neonSign(sg, sign, cx, G - 47, color)
      break
    }
    case 'terreno': {
      rect(ctx, x, G - 6, w, 6, '#1a1030')
      ;[x + 10, x + 30, x + 56].forEach((mx) => rect(ctx, mx, G - 7, 8, 2, '#2a1a3a'))
      rect(ctx, x + 42, G - 9, 3, 2, '#ff3b3b')
      for (let fx = x; fx <= x + w; fx += 14) rect(ctx, fx, G - 28, 2, 28, '#4a3a6e')
      rect(ctx, x, G - 28, w + 2, 1, '#4a3a6e')
      ctx.save()
      ctx.beginPath()
      ctx.rect(x, G - 28, w + 2, 28)
      ctx.clip()
      ctx.strokeStyle = 'rgba(122,104,170,.45)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let d = -28; d < w; d += 4) {
        ctx.moveTo(x + d + 0.5, G)
        ctx.lineTo(x + d + 28.5, G - 28)
        ctx.moveTo(x + d + 28.5, G)
        ctx.lineTo(x + d + 0.5, G - 28)
      }
      ctx.stroke()
      ctx.restore()
      ctx.fillStyle = '#ffe14a'
      ctx.beginPath()
      ctx.moveTo(cx, G - 24)
      ctx.lineTo(cx + 8, G - 10)
      ctx.lineTo(cx - 8, G - 10)
      ctx.fill()
      rect(ctx, cx, G - 20, 1, 5, '#000')
      rect(ctx, cx, G - 13, 1, 1, '#000')
      neonSign(sg, sign, cx, G - 44, color)
      break
    }
    case 'boate': {
      tower(ctx, rnd, lot)
      rect(ctx, x, G - 34, w - 4, 34, '#16061e')
      rect(ctx, x + w / 2 - 13, G - 24, 22, 24, '#05020a')
      rect(ctx, x + w / 2 - 13, G - 25, 22, 1, '#ff2e93')
      ;[x + 10, x + w - 16].forEach((px) => {
        rect(ctx, px, G - 9, 1, 9, '#d4af37')
        rect(ctx, px - 1, G - 10, 3, 1, '#d4af37')
      })
      ctx.strokeStyle = '#b3123b'
      ctx.beginPath()
      ctx.moveTo(x + 10.5, G - 8.5)
      ctx.quadraticCurveTo(x + w / 2 - 17, G - 3, x + w / 2 - 14.5, G - 8.5)
      ctx.stroke()
      // painel escuro da placa de pernas neon (SVG em `CityStreet`)
      rect(ctx, x + 12, G - 98, w - 28, 44, '#07040f')
      neonSign(sg, sign, cx - 2, G - 46, color)
      break
    }
    case 'mural': {
      // quadro de avisos na escala das pessoas: papéis presos com tachinhas, alguns rasgados (o solto balança por frame)
      const bx = x + 5
      const by = G - 26
      const bw = w - 10
      rect(ctx, x + 8, G - 26, 1, 26, '#3a2414')
      rect(ctx, x + w - 9, G - 26, 1, 26, '#3a2414')
      rect(ctx, x + 3, G - 29, w - 6, 2, '#2a1a3a')
      rect(ctx, x + 4, G - 27, w - 8, 19, '#5a3a1e')
      rect(ctx, bx, by, bw, 17, '#8a5a2e')
      for (let i = 0; i < 24; i++) rect(ctx, bx + Math.floor(rnd() * bw), by + Math.floor(rnd() * 17), 1, 1, '#6e4524')
      MURAL_PAPERS.forEach((paper) => notice(ctx, bx + paper.x, by + paper.y, paper, rnd))
      // sobra de um papel arrancado
      rect(ctx, bx + 33, by + 10, 3, 2, '#f4efe0')
      rect(ctx, bx + 34, by + 10, 1, 1, '#ff3b3b')
      neonSign(sg, sign, cx, G - 39, color)
      break
    }
    case 'cassino': {
      // cassino: placa vertical, marquise com lâmpadas, naipes, vitrines "777" e tapete vermelho
      tower(ctx, rnd, lot)
      rect(ctx, x, G - 40, w - 4, 40, '#1a0610')
      rect(ctx, x + w / 2 - 14, G - 28, 24, 28, '#d4af37')
      rect(ctx, x + w / 2 - 12, G - 26, 9, 26, '#3a0a14')
      rect(ctx, x + w / 2 - 1, G - 26, 9, 26, '#3a0a14')
      rect(ctx, x + w / 2 - 16, G - 2, 28, 2, '#b3123b')
      ;[x + 5, x + w - 31].forEach((vx) => {
        rect(ctx, vx, G - 28, 22, 18, '#07040f')
        rect(ctx, vx, G - 28, 22, 1, '#d4af37')
      })
      rect(ctx, x + 4, G - 66, w - 12, 24, '#07040f')
      bladeSign(sg, sign, x - 6, G - h + 8, color)
      neonSign(sg, sign, cx + 2, G - 62, '#ffe14a', false)
      ;(['spade', 'heart', 'diamond', 'club'] as const).forEach((suit, i) =>
        glow(sg, color, 4, () => bitmap(sg, SUITS[suit], Math.round(cx + 2 - 17 + i * 9), G - 51, suit === 'heart' || suit === 'diamond' ? '#ff4d6d' : mix(color, '#ffffff', 0.5))),
      )
      ;[x + 5, x + w - 31].forEach((vx) => {
        sg.font = FONT
        glow(sg, '#ff3b3b', 4, () => {
          sg.fillStyle = '#ff6b6b'
          textAt(sg, '777', Math.round(vx + 11 - sg.measureText('777').width / 2), G - 19)
        })
      })
      break
    }
  }
}

export function buildLayers(lots: Lot[], worldW: number): CityLayers {
  const world = canvas(worldW, H)
  const signs = canvas(worldW, H)
  const ctx = world.getContext('2d')!
  const sg = signs.getContext('2d')!
  // calçada, meio-fio, asfalto com faixas, poças e bueiros
  rect(ctx, 0, G, worldW, 14, '#241a44')
  rect(ctx, 0, G, worldW, 1, '#3a2c6a')
  for (let x = 0; x < worldW; x += 12) rect(ctx, x, G + 1, 1, 13, '#1a1233')
  rect(ctx, 0, G + 14, worldW, 2, '#4a3a85')
  rect(ctx, 0, G + 16, worldW, H - G - 16, '#0e0820')
  for (let x = 4; x < worldW; x += 22) rect(ctx, x, G + 31, 10, 1, 'rgba(255,225,74,.55)')
  const rnd = rng(80)
  for (let x = 30; x < worldW; x += 90 + Math.floor(rnd() * 80)) {
    ctx.fillStyle = 'rgba(80,60,140,.25)'
    ctx.beginPath()
    ctx.ellipse(x, G + 24 + Math.floor(rnd() * 16), 14 + rnd() * 10, 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const manholes: number[] = []
  for (let x = 140; x < worldW - 40; x += 260) {
    manholes.push(x)
    rect(ctx, x - 5, G + 37, 11, 2, '#1d1433')
    rect(ctx, x - 4, G + 37, 1, 2, '#3a2c55')
    rect(ctx, x + 1, G + 37, 1, 2, '#3a2c55')
  }
  lots.forEach((lot) => drawLot(ctx, sg, lot, rnd))
  const stars = Array.from({ length: 70 }, () => ({ x: rnd() * STAR_TILE, y: rnd() * 100, big: rnd() < 0.12, phase: rnd() * 6 }))
  return {
    far: skyline(FAR_TILE, 3, '#120a26', 30, 78, 0.06, false),
    mid: skyline(MID_TILE, 7, '#1c1038', 40, 96, 0.16, true),
    world,
    signs,
    worldW,
    stars,
    manholes,
  }
}

function tiled(ctx: Ctx, tile: HTMLCanvasElement, offset: number, viewW: number) {
  const start = -(((offset % tile.width) + tile.width) % tile.width)
  for (let x = Math.round(start); x < viewW; x += tile.width) ctx.drawImage(tile, x, 0)
}

/** Alfa do letreiro: alguns lotes falham de vez em quando, como neon velho. */
function signAlpha(i: number, t: number) {
  if (i % 3 !== 1) return 1
  const phase = (t + i * 1700) % (4200 + i * 600)
  return phase < 260 ? (Math.floor(phase / 45) % 2 ? 0.2 : 1) : 1
}

export function drawFrame(ctx: Ctx, layers: CityLayers, lots: Lot[], cam: number, viewW: number, t: number, animate: boolean) {
  const sky = ctx.createLinearGradient(0, 0, 0, G)
  sky.addColorStop(0, '#04020c')
  sky.addColorStop(0.5, '#140832')
  sky.addColorStop(0.85, '#3b1150')
  sky.addColorStop(1, '#6a1a5a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, viewW, G)

  const starOff = (((cam * 0.04) % STAR_TILE) + STAR_TILE) % STAR_TILE
  for (const s of layers.stars) {
    const x = Math.round(s.x - starOff + (s.x - starOff < -2 ? STAR_TILE : 0))
    if (x > viewW) continue
    const a = animate ? 0.45 + 0.55 * Math.abs(Math.sin(t / 900 + s.phase)) : 0.8
    rect(ctx, x, s.y, s.big ? 2 : 1, s.big ? 2 : 1, `rgba(255,240,220,${a.toFixed(2)})`)
  }

  const mx = Math.round(viewW * 0.78 - cam * 0.03)
  glow(ctx, '#ffd9f0', 14, () => circle(ctx, mx, 28, 10, '#ffe9d0'))
  rect(ctx, mx - 4, 24, 3, 3, '#f0d0b8')
  rect(ctx, mx + 2, 31, 2, 2, '#f0d0b8')

  drawSearchlights(ctx, cam, viewW, animate ? t : 0)
  tiled(ctx, layers.far, cam * 0.2, viewW)
  fog(ctx, viewW, G - 44, 44, 0.14)
  tiled(ctx, layers.mid, cam * 0.5, viewW)
  fog(ctx, viewW, G - 18, 18, 0.1)

  const ox = -Math.round(cam)
  ctx.drawImage(layers.world, ox, 0)

  lots.forEach((lot, i) => {
    const sx = lot.x + ox
    if (sx > viewW || sx + lot.w < -12) return
    ctx.globalAlpha = animate ? signAlpha(i, t) : 1
    ctx.drawImage(layers.signs, lot.x - 12, 0, lot.w + 24, G, sx - 12, 0, lot.w + 24, G)
    // reflexo do neon no asfalto molhado
    const refl = ctx.createLinearGradient(0, G + 16, 0, H)
    refl.addColorStop(0, lot.color + '48')
    refl.addColorStop(1, lot.color + '00')
    ctx.fillStyle = refl
    ctx.fillRect(Math.round(sx + lot.w * 0.25), G + 16, Math.round(lot.w * 0.5), H - G - 16)
    ctx.globalAlpha = 1
    drawDynamic(ctx, lot, sx, t, animate)
  })

  people(ctx, lots, cam, viewW, layers.worldW, t, animate)
  if (animate) {
    layers.manholes.forEach((wx) => steam(ctx, wx + ox, G + 37, t, wx))
    drawCars(ctx, cam, layers.worldW, t)
  }
  drawLamps(ctx, cam, viewW)
  if (animate) rain(ctx, viewW, t)
}

function fog(ctx: Ctx, viewW: number, y: number, h: number, alpha: number) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, 'rgba(255,46,147,0)')
  g.addColorStop(1, `rgba(255,46,147,${alpha})`)
  ctx.fillStyle = g
  ctx.fillRect(0, y, viewW, h)
}

/** Holofotes varrendo o céu atrás do horizonte. */
function drawSearchlights(ctx: Ctx, cam: number, viewW: number, t: number) {
  ;[
    { at: 0.25, speed: 0.00045, phase: 0 },
    { at: 0.7, speed: 0.00035, phase: 2 },
  ].forEach((s) => {
    const bx = viewW * s.at - cam * 0.15
    const span = viewW * 1.3
    const x = ((bx % span) + span) % span - viewW * 0.15
    const a = Math.sin(t * s.speed + s.phase) * 0.45
    const len = 150
    const tipX = x + Math.sin(a) * len
    const tipY = G - 40 - Math.cos(a) * len
    const beam = ctx.createLinearGradient(x, G - 40, tipX, tipY)
    beam.addColorStop(0, 'rgba(180,220,255,.16)')
    beam.addColorStop(1, 'rgba(180,220,255,0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(x - 1, G - 40)
    ctx.lineTo(tipX - 9 * Math.cos(a), tipY - 9 * Math.sin(a))
    ctx.lineTo(tipX + 9 * Math.cos(a), tipY + 9 * Math.sin(a))
    ctx.lineTo(x + 1, G - 40)
    ctx.fill()
  })
}

/** Vulto encostado na parede do bar, na escala das pessoas: olha para frente, traga e solta a fumaça (ciclo de 6,4 s). */
function smoker(ctx: Ctx, x: number, t: number, animate: boolean) {
  const cycle = animate ? t % 6400 : 0
  const state = cycle < 2600 ? 'olhar' : cycle < 3800 ? 'tragar' : 'soltar'
  const y = G + 1
  const k = '#030106'
  rect(ctx, x - 1, y - 18, 5, 1, k)
  rect(ctx, x, y - 20, 3, 2, k)
  rect(ctx, x, y - 17, 3, 3, k)
  rect(ctx, x - 1, y - 14, 5, 9, k)
  rect(ctx, x, y - 5, 1, 5, k)
  rect(ctx, x + 2, y - 5, 1, 2, k)
  rect(ctx, x + 3, y - 4, 1, 2, k)
  rect(ctx, x - 1, y - 14, 1, 8, '#2a0a12')
  const blink = state === 'olhar' && cycle > 1500 && cycle < 1650
  if (!blink)
    glow(ctx, '#ff2020', 3, () => {
      rect(ctx, x, y - 16, 1, 1, '#ff3030')
      rect(ctx, x + 2, y - 16, 1, 1, '#ff3030')
    })
  if (state === 'tragar') {
    rect(ctx, x + 4, y - 13, 1, 2, k)
    rect(ctx, x + 3, y - 15, 1, 2, k)
    glow(ctx, '#ffb347', 5, () => rect(ctx, x + 4, y - 15, 1, 1, '#ffe08a'))
  } else {
    rect(ctx, x + 4, y - 13, 1, 5, k)
    rect(ctx, x + 5, y - 9, 1, 1, '#d8d0c8')
    rect(ctx, x + 6, y - 9, 1, 1, cycle % 900 < 450 ? '#ff7a2a' : '#c65a1e')
    if (animate) {
      const p = (cycle % 1800) / 1800
      ctx.fillStyle = `rgba(200,190,220,${(0.35 * (1 - p)).toFixed(2)})`
      ctx.fillRect(Math.round(x + 6 + Math.sin(p * 6)), Math.round(y - 10 - p * 8), 1, 1)
    }
  }
  if (state === 'soltar') {
    const p = (cycle - 3800) / 2600
    for (let i = 0; i < 4; i++) {
      const q = p - i * 0.08
      if (q <= 0 || q >= 1) continue
      ctx.fillStyle = `rgba(210,200,230,${(0.4 * (1 - q)).toFixed(2)})`
      ctx.beginPath()
      ctx.arc(x + 3 + q * 7 + i * 0.5, y - 15 - q * 11, 0.6 + q * 2.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/** Papel quase solto, preso só por uma tachinha no canto, balançando com o vento (rajadas de vez em quando). */
function loosePaper(ctx: Ctx, px: number, py: number, t: number, animate: boolean) {
  const gust = animate && t % 5200 < 1100 ? Math.sin((t % 5200) / 90) * 0.35 : 0
  const angle = 0.35 + (animate ? Math.sin(t / 260) * 0.12 : 0) + gust
  ctx.save()
  ctx.translate(px + 0.5, py + 0.5)
  ctx.rotate(angle)
  ctx.fillStyle = 'rgba(0,0,0,.3)'
  ctx.fillRect(1, 1, 6, 7)
  ctx.fillStyle = '#f4efe0'
  ctx.fillRect(0, 0, 6, 7)
  ctx.fillStyle = '#9a8f80'
  for (let ly = 2; ly < 6; ly += 2) ctx.fillRect(1, ly, ly === 4 ? 2 : 4, 1)
  ctx.restore()
  rect(ctx, px, py, 1, 1, '#ff3b3b')
}

/** Gato preto sobre o toldo da mercearia, abanando o rabo. */
function cat(ctx: Ctx, x: number, y: number, t: number, animate: boolean) {
  const k = '#05030a'
  rect(ctx, x, y - 5, 5, 5, k)
  rect(ctx, x + 3, y - 8, 4, 4, k)
  rect(ctx, x + 3, y - 9, 1, 1, k)
  rect(ctx, x + 6, y - 9, 1, 1, k)
  rect(ctx, x + 4, y - 7, 1, 1, '#7dff6a')
  rect(ctx, x + 6, y - 7, 1, 1, '#7dff6a')
  const up = animate && Math.floor(t / 500) % 2 === 1
  rect(ctx, x - 1, y - 2, 1, 2, k)
  rect(ctx, x - 2, up ? y - 5 : y - 3, 1, up ? 3 : 2, k)
}

const SHOCK_EVERY = 3200
const SHOCK_MS = 480

/** Choque na cerca elétrica: a tela pisca em ciano, arcos em zigue-zague correm pelos fios e soltam faíscas. */
function fenceShock(ctx: Ctx, sx: number, w: number, t: number) {
  const k = Math.floor(t / SHOCK_EVERY)
  const tc = t - k * SHOCK_EVERY
  if (tc > SHOCK_MS) {
    // estalos pequenos entre os choques, no topo de um poste
    if (t % 700 < 60) rect(ctx, Math.round(sx + Math.floor(hash(Math.floor(t / 700)) * (w / 14)) * 14), G - 29, 2, 1, '#bff6ff')
    return
  }
  const p = tc / SHOCK_MS
  ctx.fillStyle = `rgba(20,228,245,${(0.16 * (1 - p)).toFixed(2)})`
  ctx.fillRect(Math.round(sx), G - 28, w + 2, 28)
  const flick = Math.floor(tc / 60)
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.shadowColor = '#14e4f5'
  ctx.shadowBlur = 6
  for (let a = 0; a < 2; a++) {
    const seed = k * 13 + a * 5 + flick * 0.37
    const x0 = sx + hash(seed) * (w - 30)
    const y0 = G - 26 + hash(seed + 1) * 18
    const pts: Array<[number, number]> = []
    for (let i = 0; i <= 6; i++) pts.push([x0 + i * 5, y0 + (hash(seed + i * 2.1) - 0.5) * 7])
    ;[['#14e4f5', 2], ['#eaffff', 1]].forEach(([color, width]) => {
      ctx.strokeStyle = color as string
      ctx.lineWidth = width as number
      ctx.beginPath()
      pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)))
      ctx.stroke()
    })
    for (let f = 0; f < 3; f++) {
      const [ex, ey] = pts[f % 2 ? pts.length - 1 : 0]
      const vx = (hash(seed + f * 9) - 0.5) * 16
      ctx.fillStyle = '#fff6c0'
      ctx.fillRect(Math.round(ex + vx * p), Math.round(ey - 6 * p + 14 * p * p), 1, 1)
    }
  }
  ctx.restore()
}

function drawDynamic(ctx: Ctx, lot: Lot, sx: number, t: number, animate: boolean) {
  switch (lot.kind) {
    case 'torre': {
      // ponteiros com a hora real
      const hx = sx + lot.w / 2
      const hy = G - 90
      const now = new Date()
      const hand = (angle: number, len: number, color: string) => {
        ctx.strokeStyle = color
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(hx + 0.5, hy + 0.5)
        ctx.lineTo(hx + 0.5 + Math.sin(angle) * len, hy + 0.5 - Math.cos(angle) * len)
        ctx.stroke()
      }
      hand(((now.getHours() % 12) + now.getMinutes() / 60) * (Math.PI / 6), 5, '#2a1a40')
      hand(now.getMinutes() * (Math.PI / 30), 8, '#2a1a40')
      if (animate) hand(now.getSeconds() * (Math.PI / 30), 8, '#ff2e93')
      rect(ctx, hx, hy, 1, 1, '#2a1a40')
      break
    }
    case 'terreno':
      if (animate) fenceShock(ctx, sx, lot.w, t)
      break
    case 'loteria': {
      // painel de LED com a dezena sorteada da vez
      const n = String((Math.floor((animate ? t : 0) / 1200) * 37 + 7) % 60 + 1).padStart(2, '0')
      ctx.font = FONT
      glow(ctx, '#ffe14a', 4, () => {
        ctx.fillStyle = '#ffe14a'
        textAt(ctx, n, Math.round(sx + 49 - ctx.measureText(n).width / 2), G - 24.5)
      })
      break
    }
    case 'bar':
      smoker(ctx, sx + 68, t, animate)
      break
    case 'mural':
      loosePaper(ctx, sx + 5 + 26, G - 26 + 3, t, animate)
      break
    case 'mercearia':
      cat(ctx, sx + lot.w - 14, G - 40, t, animate)
      break
    case 'cassino': {
      const step = animate ? Math.floor(t / 130) : 0
      let k = 0
      for (let bx = sx + 5; bx < sx + lot.w - 8; bx += 4, k++) {
        const on = (k + step) % 3 === 0
        rect(ctx, bx, G - 66, 1, 1, on ? '#ffe14a' : '#4a3a2a')
        rect(ctx, bx, G - 43, 1, 1, on ? '#ffe14a' : '#4a3a2a')
      }
      break
    }
    case 'tvs': {
      for (let i = 0; i < 4; i++) {
        const seed = animate ? Math.floor(t / 110) + i * 7 : i * 7
        const tx = sx + 8 + i * 16
        const hue = NEON[(seed >> 2) % 4]
        rect(ctx, tx, G - 24, 12, 9, mix(hue, BG, 0.45))
        for (let n = 0; n < 6; n++) rect(ctx, tx + ((seed * 7 + n * 5) % 12), G - 24 + ((seed * 3 + n * 2) % 9), 1, 1, 'rgba(255,255,255,.7)')
      }
      break
    }
  }
}

/** Vapor saindo do bueiro. */
function steam(ctx: Ctx, x: number, y: number, t: number, seed: number) {
  for (let i = 0; i < 4; i++) {
    const p = ((t / 2600 + i / 4 + seed * 0.13) % 1)
    ctx.fillStyle = `rgba(200,190,230,${(0.18 * (1 - p)).toFixed(2)})`
    ctx.beginPath()
    ctx.arc(x + Math.sin(p * 5 + i) * 3, y - p * 26, 2 + p * 6, 0, Math.PI * 2)
    ctx.fill()
  }
}

const CARS = [
  { lane: G + 19, dir: -1, speed: 0.045, offset: 0, body: '#ffe14a', roof: '#d4b020', taxi: true },
  { lane: G + 27, dir: 1, speed: 0.06, offset: 300, body: '#2b1650', roof: '#2b1650', taxi: false },
  { lane: G + 27, dir: 1, speed: 0.05, offset: 900, body: '#b3123b', roof: '#7a0c28', taxi: false },
]

/** Carros dos anos 80 nas duas mãos da rua. */
function drawCars(ctx: Ctx, cam: number, worldW: number, t: number) {
  const span = worldW + 200
  CARS.forEach((car) => {
    const wx = ((((car.offset + car.dir * t * car.speed) % span) + span) % span) - 100
    const x = Math.round(wx - cam)
    ctx.save()
    ctx.translate(x, car.lane)
    if (car.dir < 0) ctx.scale(-1, 1)
    rect(ctx, 0, 3, 34, 6, car.body)
    rect(ctx, 7, -2, 18, 5, car.roof)
    rect(ctx, 9, -1, 6, 3, 'rgba(20,228,245,.5)')
    rect(ctx, 17, -1, 6, 3, 'rgba(20,228,245,.5)')
    if (car.taxi) rect(ctx, 13, -4, 6, 2, '#fff6c0')
    rect(ctx, 4, 8, 6, 3, '#000')
    rect(ctx, 24, 8, 6, 3, '#000')
    rect(ctx, 0, 4, 2, 2, '#ff2e4d')
    rect(ctx, 33, 4, 1, 2, '#fff6c0')
    const beam = ctx.createLinearGradient(34, 0, 70, 0)
    beam.addColorStop(0, 'rgba(255,246,192,.35)')
    beam.addColorStop(1, 'rgba(255,246,192,0)')
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(34, 4)
    ctx.lineTo(70, 0)
    ctx.lineTo(70, 11)
    ctx.fill()
    ctx.restore()
  })
}

/** Postes em primeiro plano (1.3x), com poça de luz na calçada. */
function drawLamps(ctx: Ctx, cam: number, viewW: number) {
  const spacing = 170
  const off = cam * 1.3
  const first = Math.floor((off - 40) / spacing)
  for (let i = first; i * spacing - off < viewW + 20; i++) {
    const x = Math.round(i * spacing + 120 - off)
    const light = ctx.createRadialGradient(x + 9, G + 6, 0, x + 9, G + 6, 26)
    light.addColorStop(0, 'rgba(255,214,140,.22)')
    light.addColorStop(1, 'rgba(255,214,140,0)')
    ctx.fillStyle = light
    ctx.fillRect(x - 20, G - 20, 58, 50)
    rect(ctx, x, 46, 3, H - 46, '#0b0716')
    rect(ctx, x, 46, 11, 2, '#0b0716')
    rect(ctx, x + 8, 48, 5, 2, '#0b0716')
    glow(ctx, '#ffd68c', 8, () => rect(ctx, x + 8, 50, 5, 1, '#ffe6b0'))
  }
}

/** Hash determinístico 0..1, para sortear sem guardar estado entre frames. */
function hash(n: number) {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** Três camadas de chuva (fundo fino e lento, frente longa e rápida), inclinadas pelo vento. */
const RAIN_LAYERS = [
  { n: 46, speed: 0.11, len: 3, alpha: 0.14, wind: 0.16, floor: [G + 1, G + 15] },
  { n: 30, speed: 0.19, len: 6, alpha: 0.22, wind: 0.2, floor: [G + 14, G + 34] },
  { n: 12, speed: 0.3, len: 10, alpha: 0.34, wind: 0.24, floor: [G + 28, H - 2] },
]
const SPLASH_MS = 240

/** Chuva com respingos: cada gota cai até o chão sorteado e abre uma coroa que se desfaz. */
function rain(ctx: Ctx, viewW: number, t: number) {
  RAIN_LAYERS.forEach((layer, li) => {
    const splashes: Array<[number, number, number]> = []
    ctx.strokeStyle = `rgba(190,205,255,${layer.alpha})`
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < layer.n; i++) {
      const seed = li * 1000 + i
      const ground = layer.floor[0] + hash(seed) * (layer.floor[1] - layer.floor[0])
      const fall = (ground + layer.len) / layer.speed
      const cycle = fall + SPLASH_MS
      const local = t + hash(seed + 0.37) * cycle
      const k = Math.floor(local / cycle)
      const tc = local - k * cycle
      const x0 = hash(seed * 7.1 + k * 13.7) * (viewW + 40) - 20 - layer.wind * ground
      if (tc < fall) {
        const y = tc * layer.speed - layer.len
        const x = x0 + layer.wind * y
        ctx.moveTo(Math.round(x) + 0.5, Math.round(y))
        ctx.lineTo(Math.round(x + layer.wind * layer.len) + 0.5, Math.round(y + layer.len))
      } else splashes.push([Math.round(x0 + layer.wind * ground), Math.round(ground), (tc - fall) / SPLASH_MS])
    }
    ctx.stroke()
    for (const [x, y, p] of splashes) {
      const a = (layer.alpha * 1.6 * (1 - p)).toFixed(2)
      const r = 1 + p * (2 + li * 1.5)
      ctx.strokeStyle = `rgba(200,215,255,${a})`
      ctx.beginPath()
      ctx.ellipse(x + 0.5, y + 0.5, r, r * 0.35, 0, 0, Math.PI * 2)
      ctx.stroke()
      if (p < 0.6) {
        const hop = Math.round(Math.sin(p * Math.PI) * (2 + li))
        ctx.fillStyle = `rgba(210,225,255,${a})`
        ctx.fillRect(x - 1 - Math.round(p * 3), y - hop, 1, 1)
        ctx.fillRect(x + 1 + Math.round(p * 3), y - hop, 1, 1)
      }
    }
  })
}

type Look = { skin: string; hair: string; hairStyle: number; top: string; bottom: string; shoes: string }

const SKINS = ['#f1c9a5', '#d9a679', '#a8724a', '#6b4428', '#4a2e1c']
const HAIRS = ['#1a0f0a', '#5a3018', '#e8c070', '#c0392b', '#2a1a3a']
const TOPS = [...NEON, '#f4efe0', '#6c5ce7', '#2b2b38']
const BOTTOMS = ['#2d3a8c', '#1a1a24', '#5a2a6a', '#3a5a8a', '#4a3a2a']

/** Aparência sorteada pela semente, levemente escurecida pela noite. */
function lookFor(seed: number): Look {
  const pick = <T,>(list: T[], salt: number) => list[Math.floor(hash(seed * 3.3 + salt) * list.length)]
  const night = (c: string) => mix(c, BG, 0.18)
  return {
    skin: night(pick(SKINS, 1)),
    hair: night(pick(HAIRS, 2)),
    hairStyle: Math.floor(hash(seed + 9.1) * 4),
    top: night(pick(TOPS, 3)),
    bottom: night(pick(BOTTOMS, 4)),
    shoes: pick(['#f4efe0', '#1a1a24', '#ff2e93'], 5),
  }
}

type Pose = 'walk' | 'skate' | 'stand'

/** Pessoa em pixel art (~17 px), de perfil, com os pés em (x, y); `phase` 0..1 anima o passo. */
function person(ctx: Ctx, x: number, y: number, look: Look, phase: number, pose: Pose, dir: 1 | -1) {
  ctx.save()
  ctx.translate(Math.round(x), Math.round(y))
  ctx.scale(dir, 1)
  const s = Math.sin(phase * Math.PI * 2)
  const lean = pose === 'skate' ? 1 : 0
  const shade = mix(look.bottom, '#000000', 0.3)
  const foot = (fx: number) => {
    if (pose === 'skate') {
      rect(ctx, fx - 1, -1, 3, 1, '#ff2e93')
      rect(ctx, fx - 1, 0, 1, 1, '#ffe14a')
      rect(ctx, fx + 1, 0, 1, 1, '#ffe14a')
    } else rect(ctx, fx, -1, 2, 1, look.shoes)
  }
  if (pose === 'skate') {
    // perna de apoio reta, a outra empurra para trás
    const back = -1 - Math.round(Math.abs(s) * 3)
    rect(ctx, 1, -6, 1, 5, look.bottom)
    for (let i = 0; i < 5; i++) rect(ctx, Math.round(back + ((1 - back) * (4 - i)) / 4) - 1, -6 + i, 1, 1, shade)
    foot(back)
    foot(1)
  } else {
    const a = pose === 'walk' ? Math.round(s * 1.5) : 0
    rect(ctx, a, -6, 1, 5, look.bottom)
    rect(ctx, 1 - a, -6, 1, 5, shade)
    foot(a)
    foot(1 - a)
  }
  rect(ctx, -1 + lean, -12, 3, 6, look.top)
  const sleeve = mix(look.top, '#000000', 0.25)
  if (pose === 'skate') {
    rect(ctx, lean - 2, -11, 2, 1, sleeve)
    rect(ctx, lean + 2, -10 + Math.round(s), 2, 1, sleeve)
  } else {
    const hx = pose === 'walk' ? Math.round(-s * 1.5) : 0
    rect(ctx, hx, -11, 1, 4, sleeve)
    rect(ctx, hx, -7, 1, 1, look.skin)
  }
  rect(ctx, -1 + lean, -15, 3, 3, look.skin)
  rect(ctx, 1 + lean, -14, 1, 1, '#1a0f0a')
  const hx = -1 + lean
  if (look.hairStyle === 0) {
    rect(ctx, hx, -16, 3, 1, look.hair)
    rect(ctx, hx, -15, 1, 2, look.hair)
  } else if (look.hairStyle === 1) {
    rect(ctx, hx, -16, 3, 1, look.hair)
    rect(ctx, hx - 1, -15, 2, 5, look.hair)
  } else if (look.hairStyle === 2) {
    rect(ctx, hx - 1, -18, 5, 3, look.hair)
    rect(ctx, hx - 1, -15, 1, 2, look.hair)
  } else {
    rect(ctx, hx, -16, 3, 1, look.top)
    rect(ctx, hx + 3, -16, 1, 1, look.top)
    rect(ctx, hx, -15, 1, 1, look.hair)
  }
  ctx.restore()
}

/** Patinadores circulando pela calçada, nas duas direções. */
const SKATERS = [
  { speed: 0.03, y: G + 11, dir: 1 as const, off: 0, seed: 11 },
  { speed: 0.024, y: G + 9, dir: -1 as const, off: 520, seed: 23 },
  { speed: 0.036, y: G + 12, dir: 1 as const, off: 860, seed: 37 },
  { speed: 0.02, y: G + 10, dir: -1 as const, off: 260, seed: 41 },
]

/** Porta de cada loja onde clientes entram e saem (centro, em coordenadas do mundo). */
const DOORS: Partial<Record<Lot['kind'], (lot: Lot) => number>> = {
  biblioteca: (lot) => lot.x + lot.w / 2,
  mercearia: (lot) => lot.x + lot.w / 2 - 2,
  loteria: (lot) => lot.x + lot.w - 16,
  torre: (lot) => lot.x + lot.w / 2,
  bar: (lot) => lot.x + 46,
  cassino: (lot) => lot.x + lot.w / 2 - 2,
}

const VISITORS = 7
const VISIT_CYCLE = 13000
const WALK_SPEED = 0.014
const DOOR_MS = 650

/** Clientes: saem de uma porta, andam pela calçada e entram em outra loja próxima; depois somem até o próximo ciclo. */
function visitors(ctx: Ctx, lots: Lot[], ox: number, viewW: number, t: number) {
  const doors = lots.flatMap((lot) => (DOORS[lot.kind] ? [DOORS[lot.kind]!(lot)] : []))
  for (let i = 0; i < VISITORS; i++) {
    const local = t + (i * VISIT_CYCLE) / VISITORS + hash(i) * 2000
    const k = Math.floor(local / VISIT_CYCLE)
    const tc = local - k * VISIT_CYCLE
    const from = doors[Math.floor(hash(i * 31 + k * 7.7) * doors.length)]
    const near = doors.filter((d) => d !== from && Math.abs(d - from) < 150)
    const to = near.length ? near[Math.floor(hash(i * 17 + k * 3.1) * near.length)] : from
    const walk = Math.abs(to - from) / WALK_SPEED
    const dir = to >= from ? 1 : -1
    const look = lookFor(i * 101 + k)
    const doorLight = (dx: number, p: number) => {
      const a = (0.4 * Math.sin(p * Math.PI)).toFixed(2)
      rect(ctx, dx + ox - 4, G - 20, 9, 20, `rgba(255,207,106,${a})`)
    }
    let x: number
    let y = G + 5
    if (tc < DOOR_MS) {
      const p = tc / DOOR_MS
      doorLight(from, p)
      x = from
      y = G + 1 + Math.round(p * 4)
    } else if (tc < DOOR_MS + walk) {
      x = from + dir * (tc - DOOR_MS) * WALK_SPEED
    } else if (tc < DOOR_MS * 2 + walk) {
      const p = (tc - DOOR_MS - walk) / DOOR_MS
      doorLight(to, p)
      x = to
      y = G + 5 - Math.round(p * 4)
    } else continue
    if (x + ox < -10 || x + ox > viewW + 10) continue
    person(ctx, x + ox, y, look, tc / 520, 'walk', dir)
  }
}

/** Fila na porta da boate, com o segurança ao lado; de vez em quando alguém olha para trás. */
function boateQueue(ctx: Ctx, lot: Lot, sx: number, t: number, animate: boolean) {
  const door = sx + lot.w / 2 - 2
  for (let j = 5; j >= 0; j--) {
    const turn = animate && hash(j * 5 + Math.floor(t / 2300)) > 0.82
    const shift = animate && hash(j * 9 + Math.floor(t / 1700)) > 0.75 ? 1 : 0
    person(ctx, door - 16 - j * 7 + shift, G + 4, lookFor(500 + j), 0, 'stand', turn ? -1 : 1)
  }
  const bouncer: Look = { skin: '#6b4428', hair: '#1a0f0a', hairStyle: 0, top: '#0b0b12', bottom: '#0b0b12', shoes: '#000000' }
  person(ctx, door + 12, G + 4, bouncer, 0, 'stand', -1)
  rect(ctx, door + 11, G - 8, 4, 1, '#3a2a40')
}

/** Todas as pessoas, de trás para a frente: fila, clientes e patinadores. */
function people(ctx: Ctx, lots: Lot[], cam: number, viewW: number, worldW: number, t: number, animate: boolean) {
  const ox = -Math.round(cam)
  const boate = lots.find((lot) => lot.kind === 'boate')
  if (boate) boateQueue(ctx, boate, boate.x + ox, t, animate)
  if (!animate) return
  visitors(ctx, lots, ox, viewW, t)
  const span = worldW + 40
  SKATERS.forEach((sk) => {
    const wx = ((((sk.off + sk.dir * t * sk.speed) % span) + span) % span) - 20
    const x = wx + ox
    if (x < -12 || x > viewW + 12) return
    person(ctx, x, sk.y, lookFor(sk.seed), t / 900 + sk.seed, 'skate', sk.dir)
  })
}
