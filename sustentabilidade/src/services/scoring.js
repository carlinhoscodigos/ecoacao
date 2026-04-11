import { getLogsByUser, getLogsByUserToday, getAllUsers, getAllLogs } from './storage';

export function calcUserTotalPoints(userId) {
  return getLogsByUser(userId).reduce((sum, l) => sum + l.pointsEarned, 0);
}

export function calcUserTodayPoints(userId) {
  return getLogsByUserToday(userId).reduce((sum, l) => sum + l.pointsEarned, 0);
}

export function calcUserTodayActionsCount(userId) {
  return getLogsByUserToday(userId).length;
}

export function buildRanking() {
  const users = getAllUsers();
  const logs = getAllLogs();

  const pointsMap = {};
  logs.forEach((l) => {
    pointsMap[l.userId] = (pointsMap[l.userId] || 0) + l.pointsEarned;
  });

  return users
    .map((u) => ({ ...u, totalPoints: pointsMap[u.id] || 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

export function getUserLevel(totalPoints) {
  if (totalPoints >= 500) return { level: 5, title: 'Guardião da Terra', icon: '🌍', min: 500, next: null };
  if (totalPoints >= 250) return { level: 4, title: 'Eco Herói', icon: '🦸', min: 250, next: 500 };
  if (totalPoints >= 100) return { level: 3, title: 'Verde Ativo', icon: '🌿', min: 100, next: 250 };
  if (totalPoints >= 40)  return { level: 2, title: 'Eco Aprendiz', icon: '🌱', min: 40, next: 100 };
  return { level: 1, title: 'Iniciante', icon: '🌾', min: 0, next: 40 };
}

export function getLevelProgress(totalPoints) {
  const { min, next } = getUserLevel(totalPoints);
  if (!next) return 100;
  return Math.round(((totalPoints - min) / (next - min)) * 100);
}
