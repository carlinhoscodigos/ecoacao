import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import Layout from '../components/layout/Layout';
import Badge from '../components/common/Badge';
import { ACTIONS_CATALOG, CATEGORY_LABELS } from '../data/actions';
import styles from './ActionsPage.module.css';

const CATEGORY_BADGE_COLOR = {
  agua: 'blue',
  energia: 'yellow',
  residuos: 'green',
  transporte: 'teal',
  alimentacao: 'purple',
  reutilizacao: 'orange',
};

export default function ActionsPage() {
  const { registerAction, getTodayLogs } = useApp();
  const [filter, setFilter] = useState('all');
  const [feedback, setFeedback] = useState(null);
  const [toast, setToast] = useState(null);

  const todayLogs = getTodayLogs();
  const todayActionIds = todayLogs.map((l) => l.actionId);

  const filtered = filter === 'all'
    ? ACTIONS_CATALOG
    : ACTIONS_CATALOG.filter((a) => a.category === filter);

  async function handleRegister(action) {
    const result = await registerAction(action);
    setFeedback(action.id);
    let toastDismissMs = 2600;
    if (result) {
      const extras = [];

      if (result.streakIncreased) {
        extras.push(
          `Sequência · ${result.currentStreak} ${result.currentStreak === 1 ? 'dia' : 'dias'}`
        );
      }

      if (result.unlockedAchievements?.length > 0) {
        const unlocked = result.unlockedAchievements[0];
        extras.push(`Conquista · ${unlocked.icon} ${unlocked.title}`);
      }

      if (result.positionGain > 0) {
        extras.push(
          `Ranking · subiu ${result.positionGain} ${result.positionGain === 1 ? 'posição' : 'posições'}`
        );
      }

      if (extras.length > 0) toastDismissMs = 3800;

      setToast({
        title: 'Ação registrada',
        pointsLine: `+${result.pointsEarned} pts`,
        extras,
      });
    }
    setTimeout(() => setFeedback(null), 2000);
    setTimeout(() => setToast(null), toastDismissMs);
  }

  const toastNode =
    toast &&
    createPortal(
      <div className={styles.toast} role="status" aria-live="polite">
        <div className={styles.toastHead}>
          <span className={styles.toastTitle}>{toast.title}</span>
          <span className={styles.toastPoints}>{toast.pointsLine}</span>
        </div>
        {toast.extras?.length > 0 && (
          <div className={styles.toastExtras}>
            {toast.extras.map((line, index) => (
              <span key={`${line}-${index}`} className={styles.toastExtra}>
                {line}
              </span>
            ))}
          </div>
        )}
      </div>,
      document.body
    );

  return (
    <Layout>
      {toastNode}
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Ações Sustentáveis ✅</h1>
            <p className={styles.sub}>
              Selecione as ações que você realizou hoje e acumule pontos.
            </p>
          </div>
          <div className={styles.todaySummary}>
            <span className={styles.todayCount}>{todayLogs.length}</span>
            <span className={styles.todayLabel}>ações hoje</span>
          </div>
        </div>

        <div className={styles.filters}>
          <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>Todas</FilterBtn>
          {Object.entries(CATEGORY_LABELS).map(([key, cat]) => (
            <FilterBtn key={key} active={filter === key} onClick={() => setFilter(key)}>
              {cat.icon} {cat.label}
            </FilterBtn>
          ))}
        </div>

        <div className={styles.grid}>
          {filtered.map((action) => {
            const doneToday = todayActionIds.includes(action.id);
            const isJustDone = feedback === action.id;
            return (
              <ActionCard
                key={action.id}
                action={action}
                doneToday={doneToday}
                isJustDone={isJustDone}
                onRegister={() => handleRegister(action)}
              />
            );
          })}
        </div>
      </div>
    </Layout>
  );
}

function FilterBtn({ children, active, onClick }) {
  return (
    <button
      className={[styles.filterBtn, active ? styles.filterActive : ''].join(' ')}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function ActionCard({ action, doneToday, isJustDone, onRegister }) {
  const catColor = CATEGORY_BADGE_COLOR[action.category] || 'green';
  const catLabel = CATEGORY_LABELS[action.category];

  return (
    <div className={[styles.card, doneToday ? styles.cardDone : '', isJustDone ? styles.cardFlash : ''].join(' ')}>
      <div className={styles.cardTop}>
        <div className={styles.actionIcon} style={{ background: `${action.color}22` }}>
          {action.icon}
        </div>
        <div className={styles.pts}>
          <span className={styles.ptsNum}>+{action.points}</span>
          <span className={styles.ptsLabel}>pts</span>
        </div>
      </div>
      <h3 className={styles.actionTitle}>{action.title}</h3>
      <p className={styles.actionDesc}>{action.description}</p>
      <div className={styles.cardBottom}>
        <Badge color={catColor}>{catLabel?.icon} {catLabel?.label}</Badge>
        <button
          className={[styles.registerBtn, doneToday ? styles.registerBtnDone : ''].join(' ')}
          onClick={onRegister}
          style={!doneToday ? { background: action.color } : {}}
        >
          {isJustDone ? '🎉 Registrado!' : doneToday ? '✅ Feito!' : 'Registrar'}
        </button>
      </div>
    </div>
  );
}
