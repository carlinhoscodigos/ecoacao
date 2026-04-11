import { ACTIONS_CATALOG } from '../data/actions';

const ACTION_TO_CATEGORY = Object.fromEntries(
  ACTIONS_CATALOG.map((action) => [action.id, action.category])
);

export const ACHIEVEMENTS = [
  {
    id: 'first-action',
    title: 'Primeira ação',
    description: 'Registre sua primeira ação sustentável.',
    icon: '🌱',
    color: 'green',
    check: ({ totalActions }) => totalActions >= 1,
  },
  {
    id: 'five-actions',
    title: 'Ritmo inicial',
    description: 'Complete 5 ações registradas.',
    icon: '📝',
    color: 'blue',
    check: ({ totalActions }) => totalActions >= 5,
  },
  {
    id: 'ten-actions',
    title: 'Hábito em formação',
    description: 'Complete 10 ações registradas.',
    icon: '🚀',
    color: 'teal',
    check: ({ totalActions }) => totalActions >= 10,
  },
  {
    id: 'fifty-points',
    title: '50 pontos',
    description: 'Alcance 50 pontos acumulados.',
    icon: '⭐',
    color: 'yellow',
    check: ({ totalPoints }) => totalPoints >= 50,
  },
  {
    id: 'hundred-points',
    title: '100 pontos',
    description: 'Alcance 100 pontos acumulados.',
    icon: '🏅',
    color: 'orange',
    check: ({ totalPoints }) => totalPoints >= 100,
  },
  {
    id: 'streak-3',
    title: 'Constância verde',
    description: 'Fique 3 dias seguidos registrando ações.',
    icon: '🔥',
    color: 'red',
    check: ({ bestStreak }) => bestStreak >= 3,
  },
  {
    id: 'streak-7',
    title: 'Semana completa',
    description: 'Fique 7 dias seguidos registrando ações.',
    icon: '🏆',
    color: 'purple',
    check: ({ bestStreak }) => bestStreak >= 7,
  },
  {
    id: 'first-water',
    title: 'Guardião da água',
    description: 'Registre sua primeira ação de água.',
    icon: '💧',
    color: 'blue',
    check: ({ categoryCounts }) => (categoryCounts.agua || 0) >= 1,
  },
  {
    id: 'first-energy',
    title: 'Energia consciente',
    description: 'Registre sua primeira ação de energia.',
    icon: '⚡',
    color: 'yellow',
    check: ({ categoryCounts }) => (categoryCounts.energia || 0) >= 1,
  },
  {
    id: 'first-residues',
    title: 'Mestre da reciclagem',
    description: 'Registre sua primeira ação de resíduos.',
    icon: '♻️',
    color: 'green',
    check: ({ categoryCounts }) => (categoryCounts.residuos || 0) >= 1,
  },
];

function getCategoryCounts(logs) {
  return logs.reduce((acc, log) => {
    const category = ACTION_TO_CATEGORY[log.actionId];
    if (!category) return acc;
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});
}

export function getAchievementsForUser({ logs, totalPoints, bestStreak }) {
  const totalActions = logs.length;
  const categoryCounts = getCategoryCounts(logs);

  const achievements = ACHIEVEMENTS.map((achievement) => ({
    ...achievement,
    unlocked: achievement.check({
      totalActions,
      totalPoints,
      bestStreak,
      categoryCounts,
    }),
  }));

  return {
    achievements,
    unlockedAchievements: achievements.filter((achievement) => achievement.unlocked),
    lockedAchievements: achievements.filter((achievement) => !achievement.unlocked),
  };
}

export function getNewlyUnlockedAchievements(previousAchievements, nextAchievements) {
  const previousUnlocked = new Set(
    previousAchievements
      .filter((achievement) => achievement.unlocked)
      .map((achievement) => achievement.id)
  );

  return nextAchievements.filter(
    (achievement) => achievement.unlocked && !previousUnlocked.has(achievement.id)
  );
}
