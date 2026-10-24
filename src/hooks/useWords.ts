import { useEffect, useState } from "react";
import { supabase } from "@/lib/realtime";

type WordGame = "impostor" | "password";

const PAGE_SIZE = 1000; // limite padrão de linhas por requisição do PostgREST
const cacheKey = (game: WordGame) => `alcateia-words-${game}`;

function readCache(game: WordGame): string[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(cacheKey(game)) ?? "null");
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every((word) => typeof word === "string")
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writeCache(game: WordGame, words: string[]) {
  try {
    localStorage.setItem(cacheKey(game), JSON.stringify(words));
  } catch {
    // armazenamento cheio ou bloqueado: o cache é só uma otimização
  }
}

async function fetchWords(game: WordGame) {
  if (!supabase) return [];
  const words: string[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("words")
      .select("word")
      .eq("game", game)
      .order("id")
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    words.push(...data.map((row) => row.word as string));
    if (data.length < PAGE_SIZE) return words;
  }
}

/**
 * Palavras do jogo na tabela `words` do Supabase. Devolve de imediato o cache local (ou `fallback`,
 * a lista embutida no bundle) e troca pela lista do banco quando ela chega. Sem Supabase,
 * offline ou com erro, o jogo segue com o que já tem.
 */
export function useWords(game: WordGame, fallback: string[]) {
  const [words, setWords] = useState(() => readCache(game) ?? fallback);

  useEffect(() => {
    let cancelled = false;
    fetchWords(game)
      .then((remote) => {
        if (cancelled || remote.length === 0) return;
        setWords(remote);
        writeCache(game, remote);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [game]);

  return words;
}
