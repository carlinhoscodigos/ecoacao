import { ACTIONS_CATALOG, CATEGORY_LABELS } from '../data/actions';
import { getAchievementsForUser } from './achievements.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_WEEKLY_GOAL = 60;

function toStartOfDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function differenceInDays(later, earlier) {
  return Math.round((toStartOfDay(later) - toStartOfDay(earlier)) / MS_PER_DAY);
}

function getUniqueActionDays(logs) {
  return [...new Set(logs.map((log) => toStartOfDay(log.createdAt).toISOString()))]
    .map((iso) => new Date(iso))
    .sort((a, b) => a - b);
}

export function getCurrentStreak(logs) {
  const days = getUniqueActionDays(logs);
  if (days.length === 0) return 0;

  const today = toStartOfDay(new Date());
  const lastDay = days[days.length - 1];
  const gapToToday = differenceInDays(today, lastDay);

  if (gapToToday > 1) return 0;

  let streak = 1;
  for (let i = days.length - 1; i > 0; i -= 1) {
    if (differenceInDays(days[i], days[i - 1]) === 1) streak += 1;
    else break;
  }

  return streak;
}

export function getBestStreak(logs) {
  const days = getUniqueActionDays(logs);
  if (days.length === 0) return 0;

  let best = 1;
  let current = 1;

  for (let i = 1; i < days.length; i += 1) {
    if (differenceInDays(days[i], days[i - 1]) === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }

  return best;
}

export function getWeekRange(referenceDate = new Date()) {
  const end = toStartOfDay(referenceDate);
  const start = new Date(end);
  start.setDate(end.getDate() - 6);
  return { start, end };
}

export function getWeeklyProgress(logs, weeklyGoal = DEFAULT_WEEKLY_GOAL) {
  const { start, end } = getWeekRange();
  const weekLogs = logs.filter((log) => {
    const date = toStartOfDay(log.createdAt);
    return date >= start && date <= end;
  });

  const points = weekLogs.reduce((sum, log) => sum + log.pointsEarned, 0);
  return {
    goal: weeklyGoal,
    points,
    progress: Math.min(100, Math.round((points / weeklyGoal) * 100)),
    remaining: Math.max(0, weeklyGoal - points),
  };
}

export function getRecentActions(logs, limit = 6) {
  return [...logs]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit)
    .map((log) => {
      const action = ACTIONS_CATALOG.find((item) => item.id === log.actionId);
      return {
        ...log,
        title: action?.title || log.actionId,
        icon: action?.icon || '✅',
        category: action?.category || '',
        categoryLabel: action?.category ? CATEGORY_LABELS[action.category]?.label : '',
      };
    });
}

export function getCategoryBreakdown(logs) {
  const counts = logs.reduce((acc, log) => {
    const action = ACTIONS_CATALOG.find((item) => item.id === log.actionId);
    if (!action?.category) return acc;
    acc[action.category] = (acc[action.category] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([key, value]) => ({
      key,
      value,
      label: CATEGORY_LABELS[key]?.label || key,
      icon: CATEGORY_LABELS[key]?.icon || '•',
    }))
    .sort((a, b) => b.value - a.value);
}

export function getFavoriteCategory(logs) {
  return getCategoryBreakdown(logs)[0] || null;
}

export function getUserInsights(logs, weeklyGoal = DEFAULT_WEEKLY_GOAL, totalPointsOverride = null) {
  const totalActions = logs.length;
  const totalPoints =
    totalPointsOverride == null
      ? logs.reduce((sum, log) => sum + log.pointsEarned, 0)
      : Number(totalPointsOverride);
  const currentStreak = getCurrentStreak(logs);
  const bestStreak = getBestStreak(logs);
  const achievementsData = getAchievementsForUser({
    logs,
    totalPoints,
    bestStreak,
  });

  return {
    currentStreak,
    bestStreak,
    totalPoints,
    weekly: getWeeklyProgress(logs, weeklyGoal),
    recentActions: getRecentActions(logs),
    categoryBreakdown: getCategoryBreakdown(logs),
    favoriteCategory: getFavoriteCategory(logs),
    totalActions,
    achievements: achievementsData.achievements,
    unlockedAchievements: achievementsData.unlockedAchievements,
    lockedAchievements: achievementsData.lockedAchievements,
  };
}
