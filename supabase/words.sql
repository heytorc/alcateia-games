-- Palavras do Impostor e da Mega Senha. Leitura pública (anon key); escrita só pelo painel do Supabase.
-- A semente vem de src/constants/impostor-words.ts e password-words.ts (fallback offline do app).
create table public.words (
  id bigint generated always as identity primary key,
  game text not null check (game in ('impostor', 'password', 'provavel')),
  category text not null,
  word text not null,
  unique (game, word)
);

alter table public.words enable row level security;

create policy "words são públicas para leitura"
  on public.words for select
  to anon, authenticated
  using (true);
