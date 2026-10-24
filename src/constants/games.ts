export type GameId = 'letters' | 'weight' | 'number' | 'password' | 'impostor' | 'time' | 'campo-minado'

export const games: Array<{
  id: GameId
  title: string
  description: string
  color: string
}> = [
  { id: 'letters', title: 'Sortear letras', description: 'A letra certa para o desafio da vez.', color: '#6c5ce7' },
  { id: 'weight', title: 'Sortear peso', description: 'Escolha um peso entre gramas e quilos.', color: '#00b894' },
  { id: 'number', title: 'Sortear número', description: 'Um número inteiro para qualquer brincadeira.', color: '#0984e3' },
  { id: 'time', title: 'Tempo certo', description: 'Pare o cronômetro no segundo exato.', color: '#fdcb6e' },
  { id: 'impostor', title: 'Impostor', description: 'Descubra quem está jogando um jogo duplo.', color: '#d63031' },
  { id: 'password', title: 'Mega senha', description: 'Dê uma dica. Uma palavra. Acerte a senha!', color: '#e84393' },
  { id: 'campo-minado', title: 'Campo Minado', description: 'Distribua bombas e tente sobreviver no campo.', color: '#2ecc71' },
]
