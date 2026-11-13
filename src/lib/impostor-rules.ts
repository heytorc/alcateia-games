import { impostorCategories } from "@/constants/impostor-words";

/** As listas do catálogo agrupam palavras parecidas lado a lado; a dica vem desta vizinhança. */
const HINT_RADIUS = 3;

/**
 * Palavra de apoio para o impostor que começa: uma vizinha da secreta na lista da categoria (UVA → MANGA,
 * LARANJA…), para ele ter algo plausível a dizer sem revelar nada. Sem categoria conhecida, devolve `null`.
 */
export function pickHint(word: string, random: () => number = Math.random): string | null {
  for (const list of Object.values(impostorCategories)) {
    const at = list.indexOf(word);
    if (at === -1) continue;
    const near = list.slice(Math.max(0, at - HINT_RADIUS), at + HINT_RADIUS + 1).filter((item) => item !== word);
    return near.length ? near[Math.floor(random() * near.length)] : null;
  }
  return null;
}
