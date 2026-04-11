export function formatDate(isoString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoString));
}

export function formatDateTime(isoString) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoString));
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

// Gera sigla curta de cidade a partir do nome
// ignora preposições e artigos comuns
// Ex: "Santa Cruz do Sul" → "SCS", "Rio Pardo" → "RP"
const PALAVRAS_IGNORAR = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'as', 'os', 'em', 'no', 'na']);

export function gerarSiglaCidade(nome) {
  if (!nome) return '';
  return nome
    .split(' ')
    .filter((w) => w.length > 0 && !PALAVRAS_IGNORAR.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('');
}
