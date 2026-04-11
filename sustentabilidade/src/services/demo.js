import { ACTIONS_CATALOG } from '../data/actions';

export function buildDemoData() {
  const demoUsers = [
    { id: 'demo-1', name: 'Ana Silva', classGroup: '9A', participantType: 'aluno', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'demo-2', name: 'Bruno Costa', classGroup: '9A', participantType: 'aluno', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
    { id: 'demo-3', name: 'Carla Mendes', classGroup: '9B', participantType: 'aluno', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
    { id: 'demo-4', name: 'Diego Rocha', classGroup: '9B', participantType: 'aluno', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: 'demo-5', name: 'Elisa Nunes', classGroup: '9A', participantType: 'aluno', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
    { id: 'demo-6', name: 'Felipe Torres', classGroup: '9C', participantType: 'aluno', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
    { id: 'demo-7', name: 'Gabi Lopes', classGroup: '9C', participantType: 'aluno', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
  ];

  const demoLogs = [];

  demoUsers.forEach((user) => {
    const logsCount = Math.floor(Math.random() * 6) + 4;

    for (let i = 0; i < logsCount; i++) {
      const action = ACTIONS_CATALOG[Math.floor(Math.random() * ACTIONS_CATALOG.length)];
      demoLogs.push({
        id: `demo-log-${user.id}-${i}`,
        userId: user.id,
        actionId: action.id,
        pointsEarned: action.points,
        createdAt: new Date(Date.now() - Math.floor(Math.random() * 7) * 86400000).toISOString(),
      });
    }
  });

  localStorage.setItem('ecoacao_users', JSON.stringify(demoUsers));
  localStorage.setItem('ecoacao_action_logs', JSON.stringify(demoLogs));
}
