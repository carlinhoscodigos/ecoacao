/** Nome da escola principal do projeto (fluxo interno, exceto “Outra escola”). */
export const ESCOLA_PRINCIPAL_NOME = 'Colégio Barro Vermelho';

/** Cidade fixa para quem pertence à escola principal (Aluno, Professor, Direção, Administrativo, Visitante local). */
export const CIDADE_ESCOLA_PRINCIPAL = Object.freeze({
  nome: 'Rio Pardo',
  codigoIbge: 4317301,
});

export const STORAGE_KEYS = {
  USERS: 'ecoacao_users',
  CURRENT_USER: 'ecoacao_current_user',
  ACTION_LOGS: 'ecoacao_action_logs',
  ACTIONS_CATALOG: 'ecoacao_actions_catalog',
  AUTH_TOKEN: 'ecoacao_auth_token',
  ADMIN_AUTH_TOKEN: 'ecoacao_admin_auth_token',
  MIGRATION_V1_DONE: 'ecoacao_migrated_v1',
};

export const CATEGORIES = {
  AGUA: 'agua',
  ENERGIA: 'energia',
  RESIDUOS: 'residuos',
  TRANSPORTE: 'transporte',
  ALIMENTACAO: 'alimentacao',
  REUTILIZACAO: 'reutilizacao',
};
