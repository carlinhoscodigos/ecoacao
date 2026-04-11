import { useApp } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import { ACTIONS_CATALOG } from '../data/actions';
import styles from './AboutProjectPage.module.css';

export default function AboutProjectPage() {
  const { users, logs, ranking, stats } = useApp();

  function calcAvgActionsPerUser() {
    const n = stats.userCount || users.length;
    if (n === 0) return 0;
    const total = stats.actionCount ?? logs.length;
    return (total / n).toFixed(1);
  }

  function calcAvgPointsPerUser() {
    const n = stats.userCount || users.length;
    if (n === 0) return 0;
    const totalPts = ranking.reduce((s, u) => s + (u.totalPoints || 0), 0);
    return (totalPts / n).toFixed(0);
  }

  return (
    <Layout>
      <div className={styles.page}>
        <div className={styles.hero}>
          <div className={styles.heroIcon}>🔬</div>
          <h1 className={styles.title}>Sobre o Projeto Eco Ação</h1>
          <p className={styles.heroSub}>Feira de Ciências · Projeto de Pesquisa</p>
        </div>

        <div className={styles.grid}>
          <InfoCard icon="🎯" title="Objetivo">
            Incentivar hábitos sustentáveis no cotidiano por meio de um sistema de pontuação,
            ranking e gamificação acessível a estudantes.
          </InfoCard>

          <InfoCard icon="🧪" title="Hipótese Científica">
            Um sistema de recompensas e competição saudável pode aumentar o engajamento
            em práticas sustentáveis quando comparado ao uso sem incentivo social.
          </InfoCard>

          <InfoCard icon="👥" title="Metodologia">
            Os participantes utilizam o aplicativo para registrar ações sustentáveis ao longo do período de teste.
            Os dados agregados ajudam a avaliar engajamento e percepção sobre o uso do sistema.
          </InfoCard>

          <InfoCard icon="📊" title="Dados do uso">
            <div className={styles.expData}>
              <div className={styles.expGroup} style={{ flex: 1, maxWidth: '100%' }}>
                <div className={styles.expGroupLabel}>📈 Visão geral</div>
                <div className={styles.expStat}>
                  <span className={styles.expNum}>{stats.userCount || users.length}</span>
                  <span className={styles.expLabel}>participantes cadastrados</span>
                </div>
                <div className={styles.expStat}>
                  <span className={styles.expNum}>{calcAvgActionsPerUser()}</span>
                  <span className={styles.expLabel}>ações médias por usuário</span>
                </div>
                <div className={styles.expStat}>
                  <span className={styles.expNum}>{calcAvgPointsPerUser()}</span>
                  <span className={styles.expLabel}>pontos médios por usuário</span>
                </div>
                <div className={styles.expStat}>
                  <span className={styles.expNum}>{ranking.length}</span>
                  <span className={styles.expLabel}>no ranking global</span>
                </div>
              </div>
            </div>
          </InfoCard>

          <InfoCard icon="♻️" title="Ações Disponíveis">
            <p>O sistema oferece <strong>{ACTIONS_CATALOG.length} ações sustentáveis</strong> categorizadas em áreas como água, energia, resíduos, transporte, alimentação e reutilização.</p>
            <p style={{ marginTop: 6 }}>Cada ação possui uma pontuação baseada em seu impacto ambiental estimado.</p>
          </InfoCard>
        </div>
      </div>
    </Layout>
  );
}

function InfoCard({ icon, title, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>{icon}</span>
        <h2 className={styles.cardTitle}>{title}</h2>
      </div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
