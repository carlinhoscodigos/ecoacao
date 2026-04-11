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
import styles from './DashboardPage.module.css';

const CATEGORY_BADGE_COLOR = {
  agua: 'blue',
  energia: 'yellow',
  residuos: 'green',
  transporte: 'teal',
  alimentacao: 'purple',
  reutilizacao: 'orange',
};

/** classGroup como turma: aluno, outra escola ou legado sem participantType. */
function isTurmaFromClassGroup(user) {
  const g = user?.classGroup?.trim();
  if (!g) return false;
  const pt = user.participantType;
  if (pt === 'aluno' || pt === 'outra_escola') return true;
  if (!pt) return true;
  return false;
}

/**
 * Monta a linha única escola • turma • cidade (sigla), sem separadores vazios.
 * Dados: user.escola, turma (via classGroup quando aplicável), user.cidadeSigla.
 */
function buildUserMetaLine(user) {
  const escola = (user?.escola || user?.nomeDaEscola || '').trim();
  const siglaRaw = (user?.cidadeSigla || '').trim();
  const sigla = siglaRaw.toUpperCase() || (user?.cidade ? gerarSiglaCidade(user.cidade) : '');
  const turmaVal = isTurmaFromClassGroup(user) ? (user?.classGroup || '').trim() : '';

  if (turmaVal && !escola && !sigla) {
    return `Turma: ${turmaVal}`;
  }
  if (sigla && !escola && !turmaVal) {
    return sigla;
  }
  if (escola && !turmaVal && !sigla) {
    return escola;
  }

  const parts = [];
  if (escola) parts.push(escola);
  if (turmaVal) parts.push(`Turma ${turmaVal}`);
  if (sigla) parts.push(sigla);
  return parts.length > 0 ? parts.join(' • ') : null;
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
            sub={`${todayLogs.length} ações registradas`}
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

        <div className={styles.duoTopGrid}>
          <div className={styles.goalCard}>
            <div className={styles.goalHead}>
              <div>
                <h2 className={styles.sectionTitle}>Meta semanal</h2>
                <p className={styles.goalCopy}>
                  {weekly.remaining > 0
                    ? `Faltam ${weekly.remaining} pontos para bater a meta desta semana.`
                    : 'Meta semanal concluida. Continue acumulando impacto.'}
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
              <h2 className={styles.sectionTitle}>Sequencia ativa</h2>
              <strong>{insights.currentStreak} {pluralize(insights.currentStreak, 'dia seguido', 'dias seguidos')}</strong>
              <span>
                Melhor sequencia: {insights.bestStreak} {pluralize(insights.bestStreak, 'dia', 'dias')}
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
            <h2 className={styles.sectionTitle}>Comparacao por categorias</h2>
            <p className={styles.categoryCopy}>
              {favoriteCategory
                ? `Seu foco ambiental atual esta em ${favoriteCategory.label.toLowerCase()}.`
                : 'Seu foco ambiental aparecera aqui apos as primeiras acoes.'}
            </p>
            {insights.categoryBreakdown.length === 0 ? (
              <div className={styles.categoryEmpty}>
                <p>Comece registrando uma acao de agua ou energia.</p>
                <Button size="sm" onClick={() => navigate('/acoes')}>
                  Registrar primeira acao
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

        <div className={styles.bottomGrid}>
          <div className={styles.recentCard}>
            <h2 className={styles.sectionTitle}>⏱ Historico recente</h2>
            {insights.recentActions.length === 0 ? (
              <div className={styles.emptyMsg}>
                <span>🌱</span>
                <p>Comece registrando uma acao de agua ou energia para iniciar seu historico.</p>
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

          <div className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>🚀 Ações rápidas</h2>
            {recentLogs.length === 0 && (
              <p className={styles.quickHint}>
                Dica: comece por uma acao simples de agua, energia ou residuos.
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
