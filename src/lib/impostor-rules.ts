import { impostorCategories } from "@/constants/impostor-words";

/**
 * Palavra de apoio para o impostor que começa: outra palavra da mesma categoria da secreta, para ele ter
 * algo plausível a dizer sem revelar nada. Sem categoria conhecida (palavra só do banco), devolve `null`.
 */
export function pickHint(word: string, random: () => number = Math.random): string | null {
  const group = Object.values(impostorCategories).find((list) => list.includes(word));
  const options = group?.filter((item) => item !== word) ?? [];
  return options.length ? options[Math.floor(random() * options.length)] : null;
}
