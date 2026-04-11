import { useApp } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import Avatar from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import { getUserLevel } from '../services/scoring';
import styles from './RankingPage.module.css';

// ─── Helpers ───────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  aluno:          'Aluno',
  professor:      'Professor(a)',
  direcao:        'Direção',
  administrativo: 'Administrativo',
  outra_escola:   'Outra escola',
  visitante:      'Visitante',
};

function getUserMeta(user) {
  return {
    tipo:        TYPE_LABELS[user.participantType] || 'Não informado',
    escola:      user.escola || user.nomeDaEscola  || 'Não informada',
    cidadeSigla: user.cidadeSigla                  || '--',
  };
}

// ─── Página ────────────────────────────────────────────────────────────────

export default function RankingPage() {
  const { currentUser, ranking } = useApp();

  const myPosition = ranking.findIndex((u) => u.id === currentUser?.id) + 1;

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🏆 Ranking Global</h1>
            <p className={styles.sub}>
              Veja quem está no topo das práticas sustentáveis!
            </p>
          </div>
          {myPosition > 0 && (
            <div className={styles.myPosition}>
              <span className={styles.myPosNum}>#{myPosition}</span>
              <span className={styles.myPosLabel}>sua posição</span>
            </div>
          )}
        </div>

        {ranking.length === 0 ? (
          <EmptyState
            icon="🏆"
            title="Ranking vazio"
            description="Ainda não há usuários suficientes para exibir o ranking. Comece registrando ações!"
          />
        ) : (
          <>
            <div className={styles.podium}>
              {[ranking[1], ranking[0], ranking[2]].map((user, i) => {
                if (!user) return <div key={i} className={styles.podiumSlot} />;
                const pos = i === 1 ? 1 : i === 0 ? 2 : 3;
                return (
                  <PodiumSlot
                    key={user.id}
                    user={user}
                    position={pos}
                    isCurrent={user.id === currentUser?.id}
                  />
                );
              })}
            </div>

            <div className={styles.list}>
              {ranking.map((user, index) => (
                <RankingRow
                  key={user.id}
                  user={user}
                  position={index + 1}
                  isCurrent={user.id === currentUser?.id}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

// ─── Pódio ─────────────────────────────────────────────────────────────────

function PodiumSlot({ user, position, isCurrent }) {
  const medals  = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const heights = { 1: 120, 2: 90, 3: 70 };
  const levelInfo = getUserLevel(user.totalPoints || 0);
  const { escola, cidadeSigla } = getUserMeta(user);

  const escolaDisplay = escola !== 'Não informada'
    ? (cidadeSigla !== '--' ? `${escola} · ${cidadeSigla}` : escola)
    : null;

  return (
    <div className={[styles.podiumSlot, styles[`pos${position}`], isCurrent ? styles.podiumCurrent : ''].join(' ')}>
      <Avatar name={user.name} size={52} />
      <div className={styles.podiumMedal}>{medals[position]}</div>
      <div className={styles.podiumName}>{user.name.split(' ')[0]}</div>
      <div className={styles.podiumLevel}>{levelInfo.icon} {levelInfo.title}</div>
      {escolaDisplay && (
        <div className={styles.podiumEscola}>{escolaDisplay}</div>
      )}
      <div className={styles.podiumPts}>{user.totalPoints || 0} pts</div>
      <div className={styles.podiumBlock} style={{ height: heights[position] }}>
        <span className={styles.podiumBlockNum}>#{position}</span>
      </div>
    </div>
  );
}

// ─── Linha do ranking ──────────────────────────────────────────────────────

function RankingRow({ user, position, isCurrent }) {
  const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const { tipo, escola, cidadeSigla } = getUserMeta(user);

  const metaParts = [tipo, escola, cidadeSigla].filter((v) => v && v !== '--' && v !== 'Não informada');

  return (
    <div className={[styles.row, isCurrent ? styles.rowCurrent : ''].join(' ')}>
      <div className={styles.rowPos}>
        {position <= 3
          ? medals[position]
          : <span className={styles.rowPosNum}>#{position}</span>}
      </div>

      <Avatar name={user.name} size={38} />

      <div className={styles.rowInfo}>
        <div className={styles.rowName}>
          {user.name}
          {isCurrent && <span className={styles.youBadge}>você</span>}
        </div>
        <div className={styles.rowMeta}>
          {metaParts.map((part, i) => (
            <span key={i}>
              {i > 0 && <span className={styles.metaDot}>·</span>}
              {part}
            </span>
          ))}
          {metaParts.length === 0 && (
            <span className={styles.metaEmpty}>Sem informações</span>
          )}
        </div>
      </div>

      <div className={styles.rowPoints}>
        {user.totalPoints || 0}
        <span>pts</span>
      </div>
    </div>
  );
}
