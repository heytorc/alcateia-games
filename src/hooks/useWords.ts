import { useEffect, useState } from "react";
import { supabase } from "@/lib/realtime";
import type { TabooCard } from "@/constants/taboo-cards";

type WordGame = "impostor" | "password" | "provavel";

const PAGE_SIZE = 1000; // limite padrão de linhas por requisição do PostgREST

function readCache<T>(key: string, isItem: (value: unknown) => value is T): T[] | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isItem) ? parsed : null;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch {
    // armazenamento cheio ou bloqueado: o cache é só uma otimização
  }
}

/** Lê todas as linhas de uma consulta, página a página. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}

/**
 * Catálogo vindo do Supabase. Devolve de imediato o cache local (ou `fallback`, a lista embutida
 * no bundle) e troca pela lista do banco quando ela chega. Sem Supabase, offline ou com erro,
 * o jogo segue com o que já tem.
 */
function useCatalog<T>(key: string, fallback: T[], isItem: (value: unknown) => value is T, load: () => Promise<T[]>) {
  const [items, setItems] = useState(() => readCache(key, isItem) ?? fallback);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    load()
      .then((remote) => {
        if (cancelled || remote.length === 0) return;
        setItems(remote);
        writeCache(key, remote);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // `load` e `isItem` mudam a cada render, mas dependem só de `key`
  }, [key]);

  return items;
}

const isString = (value: unknown): value is string => typeof value === "string";
const isTabooCard = (value: unknown): value is TabooCard =>
  typeof value === "object" &&
  value !== null &&
  isString((value as TabooCard).word) &&
  Array.isArray((value as TabooCard).forbidden) &&
  (value as TabooCard).forbidden.every(isString);

/** Palavras do jogo na tabela `words` (cache em `alcateia-words-<jogo>`). */
export function useWords(game: WordGame, fallback: string[]) {
  return useCatalog(`alcateia-words-${game}`, fallback, isString, async () => {
    const rows = await fetchAll<{ word: string }>((from, to) =>
      supabase!.from("words").select("word").eq("game", game).order("id").range(from, to),
    );
    return rows.map((row) => row.word);
  });
}

/** Cartas do Palavras Proibidas na tabela `taboo_cards` (cache em `alcateia-taboo-cards`). */
export function useTabooCards(fallback: TabooCard[]) {
  return useCatalog("alcateia-taboo-cards", fallback, isTabooCard, () =>
    fetchAll<TabooCard>((from, to) =>
      supabase!.from("taboo_cards").select("word, forbidden").order("id").range(from, to),
    ),
  );
}
