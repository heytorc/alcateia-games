-- Cartas do Palavras Proibidas: a palavra-alvo e as palavras que não podem ser ditas.
-- Leitura pública (anon key); escrita só pelo painel do Supabase. A semente vem de
-- src/constants/taboo-cards.ts (fallback offline do app).
create table public.taboo_cards (
  id bigint generated always as identity primary key,
  category text not null,
  word text not null unique,
  forbidden text[] not null check (cardinality(forbidden) between 3 and 6)
);

alter table public.taboo_cards enable row level security;

create policy "taboo_cards são públicas para leitura"
  on public.taboo_cards for select
  to anon, authenticated
  using (true);

-- Perguntas do Quem seria mais provável? ficam na tabela words (game = 'provavel').
alter table public.words drop constraint words_game_check;
alter table public.words add constraint words_game_check check (game in ('impostor', 'password', 'provavel'));
