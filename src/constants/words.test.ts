import { describe, expect, it } from 'vitest'
import { impostorCategories, wordBank } from './impostor-words'
import { megaPasswordCategories, megaPasswordWords } from './password-words'
import { tabooCards } from './taboo-cards'
import { provavelCategories, provavelQuestions } from './provavel-words'

const catalogs = [
  { name: 'Impostor', categories: impostorCategories, words: wordBank, minimum: 400 },
  { name: 'Mega Senha', categories: megaPasswordCategories, words: megaPasswordWords, minimum: 1500 },
]

describe.each(catalogs)('palavras do $name', ({ categories, words, minimum }) => {
  const all = Object.values(categories).flat()

  it('tem volume suficiente', () => {
    expect(words.length).toBeGreaterThanOrEqual(minimum)
  })

  it('não repete palavras, nem entre categorias', () => {
    const repeated = all.filter((word, index) => all.indexOf(word) !== index)
    expect(repeated).toEqual([])
  })

  it('usa maiúsculas, sem espaços nem pontas soltas', () => {
    const invalid = all.filter((word) => word !== word.toUpperCase() || /\s/.test(word) || /^-|-$/.test(word))
    expect(invalid).toEqual([])
  })
})

describe('cartas do Palavras Proibidas', () => {
  it('tem volume suficiente', () => {
    expect(tabooCards.length).toBeGreaterThanOrEqual(250)
  })

  it('não repete a palavra-alvo, nem entre categorias', () => {
    const words = tabooCards.map((card) => card.word)
    expect(words.filter((word, index) => words.indexOf(word) !== index)).toEqual([])
  })

  it('cada carta tem de 3 a 6 proibidas, distintas e diferentes do alvo', () => {
    const invalid = tabooCards.filter(
      ({ word, forbidden }) =>
        forbidden.length < 3 || forbidden.length > 6 || new Set(forbidden).size !== forbidden.length || forbidden.includes(word),
    )
    expect(invalid).toEqual([])
  })

  it('usa maiúsculas, sem espaços sobrando', () => {
    const texts = tabooCards.flatMap(({ word, forbidden }) => [word, ...forbidden])
    expect(texts.filter((text) => text !== text.toUpperCase() || text !== text.trim() || /\s{2}/.test(text))).toEqual([])
  })
})

describe('perguntas do Quem seria mais provável?', () => {
  const all = Object.values(provavelCategories).flat()

  it('tem volume suficiente', () => {
    expect(provavelQuestions.length).toBeGreaterThanOrEqual(120)
  })

  it('não repete perguntas, nem entre categorias', () => {
    expect(all.filter((question, index) => all.indexOf(question) !== index)).toEqual([])
  })

  it('traz só o complemento: minúscula no início, sem interrogação e sem espaços sobrando', () => {
    const invalid = all.filter(
      (question) => question !== question.trim() || /\s{2}|\?/.test(question) || question[0] !== question[0].toLowerCase(),
    )
    expect(invalid).toEqual([])
  })
})
