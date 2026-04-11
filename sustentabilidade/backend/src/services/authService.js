import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

export function hashPassword(plain) {
  return bcrypt.hashSync(plain, SALT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(config, userId, email, role = 'user') {
  return jwt.sign(
    { sub: String(userId), email, role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(config, token) {
  return jwt.verify(token, config.jwtSecret);
}

/**
 * Registo com a mesma semântica do AppContext (RegisterPage + registerUser).
 */
export function buildUserInsertPayload(body) {
  const {
    name,
    email,
    password,
    participantType,
    classGroup,
    disciplina,
    cargo,
    funcao,
    escola,
    relacao,
    outraEscolaSubtipo,
    cidade,
  } = body;

  const OUTRA_ESCOLA_SUBTIPO_LABELS = {
    aluno: 'Aluno',
    professor: 'Professor(a)',
    funcionario: 'Funcionário(a)',
    visitante: 'Visitante',
  };

  let displayGroup = (classGroup || '').trim();

  if (participantType === 'outra_escola') {
    const st = outraEscolaSubtipo || '';
    if (st === 'aluno' || st === 'professor') {
      displayGroup = (classGroup || '').trim();
    } else {
      displayGroup = '';
    }
  } else if (!displayGroup) {
    const fallbacks = {
      professor: (disciplina || '').trim() || 'Professor(a)',
      direcao: (cargo || '').trim() || 'Direção',
      administrativo: (funcao || '').trim() || 'Administrativo',
      visitante: (relacao || '').trim() || 'Visitante',
    };
    displayGroup = fallbacks[participantType] || participantType || '';
  }

  const subtipoLabel =
    participantType === 'outra_escola' && outraEscolaSubtipo
      ? OUTRA_ESCOLA_SUBTIPO_LABELS[outraEscolaSubtipo] || ''
      : '';

  const turmaValue =
    participantType === 'outra_escola' &&
    (outraEscolaSubtipo === 'aluno' || outraEscolaSubtipo === 'professor') &&
    (classGroup || '').trim()
      ? (classGroup || '').trim()
      : '';

  const escolaFinal =
    participantType === 'aluno'
      ? 'Colégio Barro Vermelho'
      : (escola || '').trim();

  const cidadeNome = cidade?.nome?.trim() || '';
  const codigoIbge = cidade?.codigoIbge ?? cidade?.codigoIbgeCidade;

  let cidadeSigla = '';
  if (cidadeNome) {
    cidadeSigla = gerarSiglaCidade(cidadeNome);
  }

  const now = new Date().toISOString();

  return {
    nome: (name || '').trim(),
    email: (email || '').trim().toLowerCase(),
    password_hash: hashPassword(password),
    tipo: participantType || '',
    subtipo: subtipoLabel || null,
    escola: escolaFinal || null,
    cidade: cidadeNome || null,
    codigo_ibge_cidade: codigoIbge != null ? Number(codigoIbge) : null,
    cidade_sigla: cidadeSigla || null,
    turma: turmaValue || null,
    class_group: displayGroup || null,
    disciplina: disciplina?.trim() || null,
    cargo: cargo?.trim() || null,
    funcao: funcao?.trim() || null,
    relacao: relacao?.trim() || null,
    created_at: now,
    updated_at: now,
  };
}

const PALAVRAS_IGNORAR = new Set([
  'de',
  'da',
  'do',
  'dos',
  'das',
  'e',
  'a',
  'o',
  'as',
  'os',
  'em',
  'no',
  'na',
]);

function gerarSiglaCidade(nome) {
  if (!nome) return '';
  return nome
    .split(' ')
    .filter((w) => w.length > 0 && !PALAVRAS_IGNORAR.has(w.toLowerCase()))
    .map((w) => w[0].toUpperCase())
    .join('');
}
