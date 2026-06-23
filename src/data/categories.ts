// Lista centralizada de categorias de profissionais autônomos.
// Para cadastrar novas categorias no sistema, basta adicionar o nome dela nesta lista!
export const PROFESSIONAL_CATEGORIES = [
  "Eletricista",
  "Pintor",
  "Manicure/Estética",
  "Professor Particular",
  "Confeitaria/Buffet",
  "Encanador",
  "Pedreiro",
  "Frete/Mudança",
  "Mecânico",
  "Designer/Web Developer",
  "Faxineira/Diarista",
  "Jardineiro",
  "Montador de Móveis",
  "Costureira",
  "Técnico de Informática",
  "Ar Condicionado / Refrigeração",
  "Marido de Aluguel",
  "Gesseiro",
  "Vidraceiro",
  "Fotógrafo",
  "Personal Trainer",
  "Cuidador de Idosos/Babá",
  "Chaveiro"
];

/**
 * Normalizes a custom category input by:
 * 1. Trimming whitespace.
 * 2. Standardizing word capitalization (e.g. "montador de móveis" -> "Montador de Móveis").
 * 3. Matching case-insensitively to existing categories in PROFESSIONAL_CATEGORIES.
 */
export function normalizeCategory(category: string): string {
  const trimmed = category.trim();
  if (!trimmed) return "";

  // Check case-insensitive match in PROFESSIONAL_CATEGORIES
  const matched = PROFESSIONAL_CATEGORIES.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (matched) return matched;

  // Otherwise, normalize capitalization (e.g. "montador de móveis" -> "Montador de Móveis")
  // Lowercase all, then capitalize the first letter of each word except common prepositions/conjunctions in Portuguese
  const prepositions = ["de", "do", "da", "dos", "das", "e", "em", "para", "com"];
  const words = trimmed.toLowerCase().split(/\s+/);
  const capitalizedWords = words.map((word, index) => {
    if (prepositions.includes(word) && index > 0) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  });

  return capitalizedWords.join(" ");
}

