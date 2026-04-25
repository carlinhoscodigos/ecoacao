import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import Avatar from '../components/common/Avatar';
import ProgressBar from '../components/common/ProgressBar';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { getUserLevel, getLevelProgress } from '../services/scoring';
import { ACTIONS_CATALOG } from '../data/actions';
import { formatDateTime, pluralize, gerarSiglaCidade } from '../utils/helpers';
import { ESCOLA_PRINCIPAL_NOME } from '../data/constants';
import styles from './DashboardPage.module.css';

const CATEGORY_BADGE_COLOR = {
  agua: 'blue',
  energia: 'yellow',
  residuos: 'green',
  transporte: 'teal',
  alimentacao: 'purple',
  reutilizacao: 'orange',
};

function trimStr(value) {
  return (value || '').trim();
}

/** Sigla exibida: cidadeSigla ou derivada do nome da cidade. */
function resolveCidadeSigla(user) {
  const raw = trimStr(user?.cidadeSigla);
  if (raw) return raw.toUpperCase();
  const cidade = trimStr(user?.cidade);
  return cidade ? gerarSiglaCidade(cidade) : '';
}

/**
 * Escola da sede: muitos perfis (ex.: professor) podem vir sem escola no payload;
 * para quem não é "outra escola", assume a escola principal.
 */
function resolveEscolaPrincipal(user) {
  const direct = trimStr(user?.escola || user?.nomeDaEscola);
  if (direct) return direct;
  const pt = user?.participantType;
  if (pt && pt !== 'outra_escola') return ESCOLA_PRINCIPAL_NOME;
  return '';
}

function joinMeta(parts) {
  const cleaned = parts.map((p) => trimStr(p)).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(' • ') : null;
}

/**
 * Linha abaixo do nome: escola • contexto por tipo • cidade (sigla).
 * Compatível com cadastros antigos e API/local.
 */
function buildUserMetaLine(user) {
  if (!user) return null;

  const pt = user.participantType || '';
  const sigla = resolveCidadeSigla(user);

  if (pt === 'outra_escola') {
    const escolaNome = trimStr(user.escola || user.nomeDaEscola);
    const subtipo = trimStr(user.subtipo);
    const parts = [];
    if (escolaNome) parts.push(escolaNome);

    if (subtipo === 'Aluno') {
      const turma = trimStr(user.turma || user.classGroup);
      if (turma) parts.push(`Turma ${turma}`);
    } else if (subtipo === 'Professor(a)') {
      const mid =
        trimStr(user.disciplina) ||
        trimStr(user.classGroup) ||
        'Professor(a)';
      parts.push(mid);
    } else if (subtipo) {
      parts.push(subtipo);
    }

    if (sigla) parts.push(sigla);
    return joinMeta(parts);
  }

  const escola = resolveEscolaPrincipal(user);

  if (pt === 'aluno' || (!pt && trimStr(user.classGroup || user.turma))) {
    const parts = [];
    if (escola) parts.push(escola);
    const turma = trimStr(user.classGroup || user.turma);
    if (turma) parts.push(`Turma ${turma}`);
    if (sigla) parts.push(sigla);
    return joinMeta(parts);
  }

  if (pt === 'professor') {
    const disc = trimStr(user.disciplina);
    const cg = trimStr(user.classGroup);
    const mid =
      disc ||
      (cg && cg !== 'Professor(a)' ? cg : '') ||
      'Professor(a)';
    return joinMeta([escola, mid, sigla]);
  }

  if (pt === 'direcao') {
    const mid = trimStr(user.cargo) || 'Direção';
    return joinMeta([escola, mid, sigla]);
  }

  if (pt === 'administrativo') {
    const mid = trimStr(user.funcao) || 'Administrativo';
    return joinMeta([escola, mid, sigla]);
  }

  if (pt === 'visitante') {
    const mid = trimStr(user.relacao) || 'Visitante';
    return joinMeta([escola, mid, sigla]);
  }

  const turmaLegacy = trimStr(user.classGroup || user.turma);
  return joinMeta([
    escola,
    turmaLegacy ? `Turma ${turmaLegacy}` : '',
    sigla,
  ]);
}

export default function DashboardPage() {
  const {
    currentUser,
    currentUserTotalPoints,
    getTodayLogs,
    getActionById,
    getCurrentUserInsights,
  } = useApp();
  const navigate = useNavigate();

  const totalPoints = currentUserTotalPoints();
  const todayLogs = getTodayLogs();
  const todayPoints = todayLogs.reduce((s, l) => s + l.pointsEarned, 0);
  const levelInfo = getUserLevel(totalPoints);
  const progress = getLevelProgress(totalPoints);
  const insights = getCurrentUserInsights();
  const weekly = insights.weekly;
  const favoriteCategory = insights.favoriteCategory;
  const achievements = insights.achievements || [];

  const recentLogs = [...getTodayLogs()].reverse().slice(0, 5);
  const userMetaLine = buildUserMetaLine(currentUser);

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.top}>
          <div className={styles.userInfo}>
            <Avatar name={currentUser.name} size={52} />
            <div>
              <h1 className={styles.greeting}>Olá, {currentUser.name.split(' ')[0]}! 👋</h1>
              {userMetaLine && <p className={styles.meta}>{userMetaLine}</p>}
            </div>
          </div>

          <div className={styles.primaryCta}>
            <Button onClick={() => navigate('/acoes')} size="lg" icon="✅">
              Registrar Ação
            </Button>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <StatCard
            emoji={levelInfo.icon}
            label="Nível atual"
            value={levelInfo.title}
            sub={`Nível ${levelInfo.level}`}
            color="green"
          />
          <StatCard
            emoji="⭐"
            label="Pontos totais"
            value={totalPoints}
            sub="pontos acumulados"
            color="yellow"
          />
          <StatCard
            emoji="📅"
            label="Hoje"
            value={`+${todayPoints}`}
            sub={`${todayLogs.length} ${pluralize(todayLogs.length, 'ação registrada', 'ações registradas')}`}
            color="blue"
          />
          <StatCard
            emoji="🎯"
            label="Ações disponíveis"
            value={ACTIONS_CATALOG.length}
            sub="categorias diferentes"
            color="purple"
          />
        </div>

        <div className={styles.quickActions}>
          <h2 className={styles.sectionTitle}>🚀 Ações rápidas</h2>
          {recentLogs.length === 0 && (
            <p className={styles.quickHint}>
              Dica: comece por uma ação simples de água, energia ou resíduos.
            </p>
          )}
          <div className={styles.quickGrid}>
            {ACTIONS_CATALOG.slice(0, 4).map((action) => (
              <button
                key={action.id}
                className={styles.quickBtn}
                onClick={() => navigate('/acoes')}
              >
                <span className={styles.quickIcon}>{action.icon}</span>
                <span className={styles.quickLabel}>{action.title}</span>
                <span className={styles.quickPts}>{action.points} pts</span>
              </button>
            ))}
          </div>
          <Button variant="secondary" fullWidth onClick={() => navigate('/acoes')} size="sm">
            Ver todas as ações →
          </Button>
        </div>

        <div className={styles.duoTopGrid}>
          <div className={styles.goalCard}>
            <div className={styles.goalHead}>
              <div>
                <h2 className={styles.sectionTitle}>Meta semanal</h2>
                <p className={styles.goalCopy}>
                  {weekly.remaining > 0
                    ? `Faltam ${weekly.remaining} pontos para bater a meta desta semana.`
                    : 'Meta semanal concluída. Continue acumulando impacto.'}
                </p>
              </div>
              <div className={styles.goalScore}>
                <strong>{weekly.points}</strong>
                <span>/ {weekly.goal} pts</span>
              </div>
            </div>
            <ProgressBar value={weekly.progress} max={100} color="primary" showLabel />
          </div>

          <div className={styles.streakCard}>
            <div className={styles.streakBadge}>🔥</div>
            <div className={styles.streakText}>
              <h2 className={styles.sectionTitle}>Sequência ativa</h2>
              <strong>{insights.currentStreak} {pluralize(insights.currentStreak, 'dia seguido', 'dias seguidos')}</strong>
              <span>
                Melhor sequência: {insights.bestStreak} {pluralize(insights.bestStreak, 'dia', 'dias')}
              </span>
            </div>
          </div>
        </div>

        <div className={styles.levelCard}>
          <div className={styles.levelHeader}>
            <span className={styles.levelIcon}>{levelInfo.icon}</span>
            <div>
              <strong>{levelInfo.title}</strong>
              {levelInfo.next ? (
                <span className={styles.levelNext}> {' - '}Próximo nível em {levelInfo.next - totalPoints} pontos</span>
              ) : (
                <span className={styles.levelNext}> - Nível máximo! 🎉</span>
              )}
            </div>
          </div>
          <ProgressBar value={progress} max={100} color="primary" showLabel />
          <div className={styles.levelLabels}>
            <span>Nível {levelInfo.level}</span>
            {levelInfo.next && <span>Nível {levelInfo.level + 1}</span>}
          </div>
        </div>

        <div className={styles.duoTopGrid}>
          <div className={styles.achievementsCard}>
            <div className={styles.achievementsHead}>
              <div>
                <h2 className={styles.sectionTitle}>Conquistas</h2>
                <p className={styles.achievementCopy}>
                  {insights.unlockedAchievements.length} de {achievements.length} medalhas desbloqueadas.
                </p>
              </div>
              <div className={styles.achievementStats}>
                <strong>{insights.unlockedAchievements.length}</strong>
                <span>desbloqueadas</span>
              </div>
            </div>
            <div className={styles.achievementGrid}>
              {achievements.map((achievement) => (
                <AchievementItem key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </div>

          <div className={styles.categoryCard}>
            <h2 className={styles.sectionTitle}>Comparação por categorias</h2>
            <p className={styles.categoryCopy}>
              {favoriteCategory
                ? `Seu foco ambiental atual está em ${favoriteCategory.label.toLowerCase()}.`
                : 'Seu foco ambiental aparecerá aqui após as primeiras ações.'}
            </p>
            {insights.categoryBreakdown.length === 0 ? (
              <div className={styles.categoryEmpty}>
                <p>Comece registrando uma ação de água ou energia.</p>
                <Button size="sm" onClick={() => navigate('/acoes')}>
                  Registrar primeira ação
                </Button>
              </div>
            ) : (
              <div className={styles.categoryList}>
                {insights.categoryBreakdown.slice(0, 4).map((item) => (
                  <div key={item.key} className={styles.categoryRow}>
                    <span>{item.icon} {item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.recentCard}>
          <h2 className={styles.sectionTitle}>⏱ Histórico recente</h2>
          {insights.recentActions.length === 0 ? (
            <div className={styles.emptyMsg}>
              <span>🌱</span>
              <p>Comece registrando uma ação de água ou energia para iniciar seu histórico.</p>
              <Button size="sm" onClick={() => navigate('/acoes')}>
                Registrar agora
              </Button>
            </div>
          ) : (
            <ul className={styles.logList}>
              {insights.recentActions.map((log) => {
                const action = getActionById(log.actionId);
                return (
                  <li key={log.id} className={styles.logItem}>
                    <span className={styles.logIcon}>{action?.icon || '✅'}</span>
                    <div className={styles.logInfo}>
                      <span className={styles.logTitle}>{action?.title || log.actionId}</span>
                      <div className={styles.logMetaRow}>
                        {log.category && (
                          <Badge color={CATEGORY_BADGE_COLOR[log.category] || 'gray'}>
                            {log.categoryLabel || log.category}
                          </Badge>
                        )}
                        <span className={styles.logTime}>{formatDateTime(log.createdAt)}</span>
                      </div>
                    </div>
                    <span className={styles.logPoints}>+{log.pointsEarned} pts</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ emoji, label, value, sub, color }) {
  return (
    <div className={[styles.statCard, styles[`stat_${color}`]].join(' ')}>
      <div className={styles.statEmoji}>{emoji}</div>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statSub}>{sub}</div>
    </div>
  );
}

function AchievementItem({ achievement }) {
  return (
    <div
      className={[
        styles.achievementItem,
        achievement.unlocked ? styles.achievementUnlocked : styles.achievementLocked,
      ].join(' ')}
    >
      <div className={styles.achievementIcon}>{achievement.icon}</div>
      <div className={styles.achievementBody}>
        <div className={styles.achievementTopRow}>
          <strong>{achievement.title}</strong>
          <span>{achievement.unlocked ? 'Liberada' : 'Bloqueada'}</span>
        </div>
        <p>{achievement.description}</p>
      </div>
    </div>
  );
}
