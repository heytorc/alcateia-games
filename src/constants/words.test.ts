import { describe, expect, it } from 'vitest'
import { impostorCategories, wordBank } from './impostor-words'
import { megaPasswordCategories, megaPasswordWords } from './password-words'

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
