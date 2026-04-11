/**
 * Converte linha da tabela users para o formato esperado pelo frontend.
 */
export function userRowToApi(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    name: row.nome,
    email: row.email,
    participantType: row.tipo || '',
    classGroup: row.class_group || '',
    cidade: row.cidade || undefined,
    codigoIbgeCidade: row.codigo_ibge_cidade ?? undefined,
    cidadeSigla: row.cidade_sigla || undefined,
    escola: row.escola || undefined,
    subtipo: row.subtipo || undefined,
    turma: row.turma || undefined,
    disciplina: row.disciplina || undefined,
    cargo: row.cargo || undefined,
    funcao: row.funcao || undefined,
    relacao: row.relacao || undefined,
    createdAt: row.created_at,
  };
}

/**
 * Log da API (formato antigo do localStorage).
 */
export function actionLogRowToApi(row, userId) {
  return {
    id: String(row.id),
    userId: String(userId),
    actionId: row.action_key,
    pointsEarned: row.pontos,
    createdAt: row.created_at,
  };
}
