import "server-only";

/**
 * Higienizacao PT-BR (FEATURE 03). Bloqueio no envio: rejeita mensagem com
 * palavrao/xingamento. Comparacao por texto normalizado (minusculo, sem acento,
 * repeticoes colapsadas, pontuacao virando espaco) com limite de palavra para
 * termos simples e substring para frases. Cru de proposito no MVP (burlavel);
 * v2 = lista gerenciada / moderacao por LLM. Reusado tambem no chat publico.
 */

// Raizes/termos bloqueados. Expandir aqui conforme necessario.
const BLOCKLIST = [
  "porra", "caralho", "merda", "buceta", "boceta", "cu", "cuzao", "viado",
  "viadinho", "puta", "puto", "putaria", "piranha", "vagabunda", "vagabundo",
  "corno", "arrombado", "arrombada", "desgraca", "desgracado", "fdp", "pqp",
  "vsf", "tnc", "otario", "otaria", "idiota", "imbecil", "babaca", "escroto",
  "escrota", "bosta", "foder", "fuder", "fodase", "cacete", "xoxota", "rola",
  "punheta", "boquete", "pinto", "piroca", "xereca", "retardado", "mongoloide",
  "aborto", "racista", "traveco", "bicha", "sapatao",
  // frases
  "vai se fuder", "toma no cu", "pau no cu", "filho da puta", "lixo humano",
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // remove acentos (combining diacritics)
    .replace(/[@4]/g, "a") // leet basico (evasao comum: caralh0, p0rra, v1ado, m3rda)
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/[5$]/g, "s")
    .replace(/(.)\1{2,}/g, "$1$1") // colapsa 3+ repeticoes (ex.: "puuuta" -> "puuta")
    .replace(/[^a-z0-9\s]/g, " ") // demais simbolos viram espaco
    .replace(/\s+/g, " ")
    .trim();
}

// true se o texto contem termo da blocklist (palavra inteira, ou frase por substring).
export function hasProfanity(text: string): boolean {
  const norm = normalizeText(text);
  if (!norm) return false;
  const padded = ` ${norm} `;
  return BLOCKLIST.some((raw) => {
    const t = normalizeText(raw);
    if (!t) return false;
    return t.includes(" ") ? norm.includes(t) : padded.includes(` ${t} `);
  });
}

export const PROFANITY_ERROR = "Mensagem contém linguagem imprópria. Reformule para enviar.";
