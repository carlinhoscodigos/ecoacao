import { useEffect, useState } from 'react';
import Button from '../components/common/Button';
import { useAdmin } from '../context/AdminContext.jsx';
import { adminFetch, readJsonOrEmpty } from '../services/adminApi.js';
import styles from './AdminPanelPage.module.css';

const TAB_ITEMS = [
  { id: 'overview', label: 'Visao geral' },
  { id: 'users', label: 'Usuarios' },
  { id: 'ranking', label: 'Ranking' },
  { id: 'reports', label: 'Graficos' },
  { id: 'settings', label: 'Configuracoes' },
];

const TYPE_LABELS = {
  aluno: 'Aluno',
  professor: 'Professor(a)',
  direcao: 'Direcao',
  administrativo: 'Administrativo',
  outra_escola: 'Outra escola',
  visitante: 'Visitante',
};

const ROLE_LABELS = {
  admin: 'Admin',
  user: 'Usuario',
};

function mapError(code) {
  const messages = {
    email_in_use: 'Esse e-mail ja esta em uso.',
    invalid_email: 'Informe um e-mail valido.',
    invalid_name: 'Informe um nome valido.',
    invalid_password: 'A senha deve ter pelo menos 6 caracteres.',
    invalid_role: 'Role invalida.',
    user_not_found: 'Usuario nao encontrado.',
    unauthorized: 'Sua sessao admin expirou. Entre novamente.',
    admin_only: 'Acesso restrito ao painel administrativo.',
    cannot_delete_self: 'Voce nao pode excluir o proprio admin logado.',
    cannot_demote_self: 'Voce nao pode remover seu proprio acesso admin.',
  };

  return messages[code] || 'Nao foi possivel concluir a operacao.';
}

async function fetchAdminJson(path, options) {
  const response = await adminFetch(path, options);
  const data = await readJsonOrEmpty(response);

  if (!response.ok) {
    const error = new Error(mapError(data.error));
    error.code = data.error;
    throw error;
  }

  return data;
}

async function fetchAdminSnapshot() {
  const [dashboardData, usersData, rankingData, statsData] = await Promise.all([
    fetchAdminJson('/api/admin/dashboard'),
    fetchAdminJson('/api/admin/users'),
    fetchAdminJson('/api/admin/ranking'),
    fetchAdminJson('/api/admin/stats'),
  ]);

  return {
    dashboard: dashboardData,
    users: usersData.users || [],
    ranking: rankingData.ranking || [],
    stats: statsData,
  };
}

function formatType(user) {
  if (user.participantType === 'outra_escola' && user.subtipo) {
    return `Outra escola - ${user.subtipo}`;
  }

  return TYPE_LABELS[user.participantType] || 'Nao informado';
}

function formatMeta(user) {
  return [user.escola, user.cidade, user.turma, formatType(user)]
    .filter(Boolean)
    .join(' - ');
}

function buildChartGradient(items, palette) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (!total) return 'conic-gradient(#d9e4db 0deg 360deg)';

  let start = 0;
  const segments = items.map((item, index) => {
    const end = start + (item.value / total) * 360;
    const color = palette[index % palette.length];
    const segment = `${color} ${start}deg ${end}deg`;
    start = end;
    return segment;
  });

  return `conic-gradient(${segments.join(', ')})`;
}

function initialPasswordForm() {
  return { currentPassword: '', newPassword: '', confirmPassword: '' };
}

function initialUserForm(user = null) {
  return {
    id: user?.id || '',
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    escola: user?.escola || '',
    cidade: user?.cidade || '',
    cidadeSigla: user?.cidadeSigla || '',
    turma: user?.turma || '',
    tipo: user?.participantType || '',
    subtipo: user?.subtipo || '',
    role: user?.role || 'user',
  };
}

export default function AdminPanelPage() {
  const { adminUser, changeAdminPassword, logoutAdmin, refreshAdmin } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({
    dashboard: null,
    users: [],
    ranking: [],
    stats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [rankingFilters, setRankingFilters] = useState({ search: '', type: '', city: '' });
  const [detailUser, setDetailUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingUser, setSavingUser] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm());
  const [passwordStatus, setPasswordStatus] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snapshot = await fetchAdminSnapshot();
        if (!cancelled) {
          setData(snapshot);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dashboard = data.dashboard || {
    summary: {
      totalUsers: 0,
      totalActions: 0,
      totalPoints: 0,
      studentCount: 0,
      teacherCount: 0,
      otherSchoolCount: 0,
    },
    topUsers: [],
    charts: { typeBreakdown: [], actionCategoryBreakdown: [] },
  };
  const users = data.users || [];
  const ranking = data.ranking || [];
  const stats = data.stats || {
    typeBreakdown: [],
    schoolBreakdown: [],
    cityBreakdown: [],
    scoreBreakdown: [],
    actionCategoryBreakdown: [],
  };

  const availableCities = [...new Set(ranking.map((user) => user.cidade).filter(Boolean))].sort();
  const availableTypes = [...new Set(ranking.map((user) => user.participantType).filter(Boolean))];
  const visibleUsers = users.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return true;
    return (
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      String(user.escola || '').toLowerCase().includes(search)
    );
  });
  const visibleRanking = ranking.filter((user) => {
    const search = rankingFilters.search.trim().toLowerCase();
    const matchesSearch =
      !search ||
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      String(user.escola || '').toLowerCase().includes(search);
    const matchesType = !rankingFilters.type || user.participantType === rankingFilters.type;
    const matchesCity = !rankingFilters.city || user.cidade === rankingFilters.city;
    return matchesSearch && matchesType && matchesCity;
  });

  async function reloadAll(silent = false) {
    if (!silent) setLoading(true);
    try {
      const snapshot = await fetchAdminSnapshot();
      setData(snapshot);
      setError('');
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  async function openUserDetails(userId) {
    try {
      const response = await fetchAdminJson(`/api/admin/users/${userId}`);
      setDetailUser(response.user || null);
    } catch (detailError) {
      setStatus(detailError.message);
    }
  }

  function closePanels() {
    setDetailUser(null);
    setEditForm(null);
  }

  async function handleDeleteUser(user) {
    const confirmed = window.confirm(
      `Excluir ${user.name}? Essa acao remove o usuario e seus registros vinculados.`
    );
    if (!confirmed) return;

    try {
      await fetchAdminJson(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      closePanels();
      setStatus('Usuario excluido com sucesso.');
      await reloadAll(true);
    } catch (deleteError) {
      setStatus(deleteError.message);
    }
  }

  async function handleSaveUser(event) {
    event.preventDefault();
    if (!editForm) return;

    setSavingUser(true);
    try {
      const response = await fetchAdminJson(`/api/admin/users/${editForm.id}`, {
        method: 'PUT',
        body: {
          name: editForm.name,
          email: editForm.email,
          password: editForm.password,
          escola: editForm.escola,
          cidade: editForm.cidade,
          cidadeSigla: editForm.cidadeSigla,
          turma: editForm.turma,
          tipo: editForm.tipo,
          subtipo: editForm.subtipo,
          role: editForm.role,
        },
      });

      closePanels();
      setStatus(`Usuario ${response.user.name} atualizado com sucesso.`);
      await reloadAll(true);
      await refreshAdmin();
    } catch (saveError) {
      setStatus(saveError.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordStatus('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus('A confirmacao da nova senha nao confere.');
      return;
    }

    setChangingPassword(true);
    const result = await changeAdminPassword(passwordForm);
    setChangingPassword(false);

    if (!result.ok) {
      setPasswordStatus(result.error);
      return;
    }

    setPasswordForm(initialPasswordForm());
    setPasswordStatus('Senha admin alterada com sucesso.');
  }

  if (loading) {
    return <div className={styles.loading}>Carregando painel administrativo...</div>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>Painel admin</span>
          <h1 className={styles.title}>Gestao do Eco Acao</h1>
          <p className={styles.subtitle}>
            Area separada do aplicativo principal para acompanhar dados, ranking e usuarios.
          </p>
        </div>

        <div className={styles.heroActions}>
          <div className={styles.adminChip}>
            <strong>{adminUser?.name || 'Administrador'}</strong>
            <span>{adminUser?.email || '-'}</span>
          </div>
          <Button variant="secondary" onClick={logoutAdmin}>
            Sair
          </Button>
        </div>
      </header>

      <nav className={styles.tabs}>
        {TAB_ITEMS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={[styles.tab, activeTab === tab.id ? styles.tabActive : ''].join(' ')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {error && <div className={styles.bannerError}>{error}</div>}
      {status && <div className={styles.bannerStatus}>{status}</div>}

      {activeTab === 'overview' && (
        <OverviewTab dashboard={dashboard} />
      )}

      {activeTab === 'users' && (
        <UsersTab
          users={visibleUsers}
          search={userSearch}
          setSearch={setUserSearch}
          onView={openUserDetails}
          onEdit={(user) => setEditForm(initialUserForm(user))}
          onDelete={handleDeleteUser}
        />
      )}

      {activeTab === 'ranking' && (
        <RankingTab
          ranking={visibleRanking}
          filters={rankingFilters}
          setFilters={setRankingFilters}
          availableCities={availableCities}
          availableTypes={availableTypes}
        />
      )}

      {activeTab === 'reports' && <ReportsTab stats={stats} />}

      {activeTab === 'settings' && (
        <SettingsTab
          adminUser={adminUser}
          dashboard={dashboard}
          logoutAdmin={logoutAdmin}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          passwordStatus={passwordStatus}
          changingPassword={changingPassword}
          onSubmit={handlePasswordSubmit}
        />
      )}

      {(detailUser || editForm) && (
        <div className={styles.overlay} onClick={closePanels}>
          <div className={styles.modal} onClick={(event) => event.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{detailUser ? 'Detalhes do usuario' : 'Editar usuario'}</h2>
                <p>
                  {detailUser
                    ? 'Visualizacao rapida dos dados cadastrados.'
                    : 'Atualize os campos essenciais com seguranca.'}
                </p>
              </div>
              <button type="button" className={styles.closeButton} onClick={closePanels}>
                Fechar
              </button>
            </div>

            {detailUser && <UserDetails user={detailUser} />}
            {editForm && (
              <UserEditForm
                form={editForm}
                setForm={setEditForm}
                saving={savingUser}
                onCancel={closePanels}
                onSubmit={handleSaveUser}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewTab({ dashboard }) {
  return (
    <section className={styles.section}>
      <div className={styles.cardGrid}>
        <MetricCard label="Usuarios" value={dashboard.summary.totalUsers} />
        <MetricCard label="Acoes" value={dashboard.summary.totalActions} />
        <MetricCard label="Pontos" value={dashboard.summary.totalPoints} />
        <MetricCard label="Alunos" value={dashboard.summary.studentCount} />
        <MetricCard label="Professores" value={dashboard.summary.teacherCount} />
        <MetricCard label="Outras escolas" value={dashboard.summary.otherSchoolCount} />
      </div>

      <div className={styles.duoGrid}>
        <ChartCard title="Top usuarios por pontos" subtitle="Resumo do ranking global">
          <BarChart items={dashboard.topUsers} valueKey="totalPoints" />
        </ChartCard>

        <ChartCard title="Participantes por tipo" subtitle="Distribuicao geral">
          <DonutChart items={dashboard.charts.typeBreakdown} />
        </ChartCard>
      </div>

      <div className={styles.duoGrid}>
        <ChartCard title="Acoes por categoria" subtitle="Categorias com mais registros">
          <BarChart items={dashboard.charts.actionCategoryBreakdown} />
        </ChartCard>

        <PanelCard title="Ranking resumido" subtitle="Top 5 participantes">
          <div className={styles.rankList}>
            {dashboard.topUsers.map((user, index) => (
              <div key={user.id} className={styles.rankItem}>
                <span className={styles.rankPos}>#{index + 1}</span>
                <div>
                  <strong>{user.name}</strong>
                  <p>{formatMeta(user) || 'Sem detalhes complementares'}</p>
                </div>
                <span className={styles.rankPoints}>{user.totalPoints} pts</span>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </section>
  );
}

function UsersTab({ users, search, setSearch, onView, onEdit, onDelete }) {
  return (
    <section className={styles.section}>
      <PanelCard title="Usuarios cadastrados" subtitle="CRUD conectado ao banco real">
        <div className={styles.filtersSingle}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, e-mail ou escola"
          />
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Tipo</th>
                <th>Subtipo</th>
                <th>Escola</th>
                <th>Cidade</th>
                <th>Turma</th>
                <th>Pontos</th>
                <th>Role</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{TYPE_LABELS[user.participantType] || '-'}</td>
                  <td>{user.subtipo || '-'}</td>
                  <td>{user.escola || '-'}</td>
                  <td>{user.cidade || '-'}</td>
                  <td>{user.turma || '-'}</td>
                  <td>{user.totalPoints || 0}</td>
                  <td>{ROLE_LABELS[user.role] || user.role}</td>
                  <td>
                    <div className={styles.rowActions}>
                      <button type="button" onClick={() => onView(user.id)}>Ver</button>
                      <button type="button" onClick={() => onEdit(user)}>Editar</button>
                      <button type="button" className={styles.dangerLink} onClick={() => onDelete(user)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </section>
  );
}

function RankingTab({ ranking, filters, setFilters, availableCities, availableTypes }) {
  return (
    <section className={styles.section}>
      <PanelCard title="Ranking administrativo" subtitle="Lista completa ordenada por pontos">
        <div className={styles.filters}>
          <input
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({ ...current, search: event.target.value }))
            }
            placeholder="Buscar por nome, e-mail ou escola"
          />
          <select
            value={filters.type}
            onChange={(event) =>
              setFilters((current) => ({ ...current, type: event.target.value }))
            }
          >
            <option value="">Todos os tipos</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
          <select
            value={filters.city}
            onChange={(event) =>
              setFilters((current) => ({ ...current, city: event.target.value }))
            }
          >
            <option value="">Todas as cidades</option>
            {availableCities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.rankingCards}>
          {ranking.map((user, index) => (
            <div key={user.id} className={styles.rankingCard}>
              <div className={styles.rankingHead}>
                <span className={styles.rankPos}>#{index + 1}</span>
                <strong>{user.name}</strong>
                <span className={styles.rankPoints}>{user.totalPoints} pts</span>
              </div>
              <p>{formatMeta(user) || 'Sem informacoes adicionais'}</p>
            </div>
          ))}
        </div>
      </PanelCard>
    </section>
  );
}

function ReportsTab({ stats }) {
  return (
    <section className={styles.section}>
      <div className={styles.duoGrid}>
        <ChartCard title="Usuarios por tipo" subtitle="Comparativo entre perfis">
          <BarChart items={stats.typeBreakdown} />
        </ChartCard>
        <ChartCard title="Usuarios por escola" subtitle="Top escolas cadastradas">
          <BarChart items={stats.schoolBreakdown} />
        </ChartCard>
      </div>

      <div className={styles.duoGrid}>
        <ChartCard title="Usuarios por cidade" subtitle="Top cidades">
          <BarChart items={stats.cityBreakdown} />
        </ChartCard>
        <ChartCard title="Faixas de pontuacao" subtitle="Distribuicao de pontos">
          <BarChart items={stats.scoreBreakdown} />
        </ChartCard>
      </div>

      <ChartCard title="Acoes por categoria" subtitle="Uso das categorias no sistema">
        <BarChart items={stats.actionCategoryBreakdown} />
      </ChartCard>
    </section>
  );
}

function SettingsTab({
  adminUser,
  dashboard,
  logoutAdmin,
  passwordForm,
  setPasswordForm,
  passwordStatus,
  changingPassword,
  onSubmit,
}) {
  return (
    <section className={styles.section}>
      <div className={styles.duoGrid}>
        <PanelCard title="Admin logado" subtitle="Informacoes da conta atual">
          <div className={styles.infoList}>
            <DetailItem label="Nome" value={adminUser?.name || '-'} />
            <DetailItem label="E-mail" value={adminUser?.email || '-'} />
            <DetailItem label="Role" value={ROLE_LABELS[adminUser?.role] || adminUser?.role || '-'} />
          </div>
          <Button variant="secondary" onClick={logoutAdmin}>
            Logout do admin
          </Button>
        </PanelCard>

        <PanelCard title="Sistema" subtitle="Resumo operacional">
          <div className={styles.infoList}>
            <DetailItem label="Banco" value="SQLite local" />
            <DetailItem label="Usuarios no ranking" value={String(dashboard.summary.totalUsers)} />
            <DetailItem label="Acoes registradas" value={String(dashboard.summary.totalActions)} />
          </div>
        </PanelCard>
      </div>

      <PanelCard title="Alterar senha admin" subtitle="Troque a senha padrao com seguranca">
        <form className={styles.passwordForm} onSubmit={onSubmit}>
          <input
            type="password"
            placeholder="Senha atual"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))
            }
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={passwordForm.newPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))
            }
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))
            }
          />
          <div className={styles.passwordActions}>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? 'Salvando...' : 'Alterar senha'}
            </Button>
          </div>
        </form>
        {passwordStatus && <p className={styles.passwordStatus}>{passwordStatus}</p>}
      </PanelCard>
    </section>
  );
}

function UserDetails({ user }) {
  return (
    <div className={styles.detailGrid}>
      <DetailItem label="Nome" value={user.name} />
      <DetailItem label="E-mail" value={user.email} />
      <DetailItem label="Tipo" value={TYPE_LABELS[user.participantType] || '-'} />
      <DetailItem label="Subtipo" value={user.subtipo || '-'} />
      <DetailItem label="Escola" value={user.escola || '-'} />
      <DetailItem label="Cidade" value={user.cidade || '-'} />
      <DetailItem label="Cidade sigla" value={user.cidadeSigla || '-'} />
      <DetailItem label="Turma" value={user.turma || '-'} />
      <DetailItem label="Pontos" value={String(user.totalPoints || 0)} />
      <DetailItem label="Role" value={ROLE_LABELS[user.role] || user.role} />
    </div>
  );
}

function UserEditForm({ form, setForm, saving, onCancel, onSubmit }) {
  return (
    <form className={styles.editForm} onSubmit={onSubmit}>
      <label>
        <span>Nome</span>
        <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
      </label>
      <label>
        <span>E-mail</span>
        <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
      </label>
      <label>
        <span>Nova senha</span>
        <input
          type="password"
          value={form.password}
          placeholder="Deixe vazio para manter a atual"
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
        />
      </label>
      <label>
        <span>Escola</span>
        <input value={form.escola} onChange={(event) => setForm((current) => ({ ...current, escola: event.target.value }))} />
      </label>
      <label>
        <span>Cidade</span>
        <input value={form.cidade} onChange={(event) => setForm((current) => ({ ...current, cidade: event.target.value }))} />
      </label>
      <label>
        <span>Cidade sigla</span>
        <input value={form.cidadeSigla} onChange={(event) => setForm((current) => ({ ...current, cidadeSigla: event.target.value }))} />
      </label>
      <label>
        <span>Turma</span>
        <input value={form.turma} onChange={(event) => setForm((current) => ({ ...current, turma: event.target.value }))} />
      </label>
      <label>
        <span>Tipo</span>
        <select value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value }))}>
          <option value="">Nao informado</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Subtipo</span>
        <input value={form.subtipo} onChange={(event) => setForm((current) => ({ ...current, subtipo: event.target.value }))} />
      </label>
      <label>
        <span>Role</span>
        <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
          <option value="user">Usuario</option>
          <option value="admin">Admin</option>
        </select>
      </label>

      <div className={styles.modalActions}>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar alteracoes'}
        </Button>
      </div>
    </form>
  );
}

function MetricCard({ label, value }) {
  return (
    <article className={styles.metricCard}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function PanelCard({ title, subtitle, children }) {
  return (
    <article className={styles.panelCard}>
      <div className={styles.panelHeader}>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <PanelCard title={title} subtitle={subtitle}>
      {children}
    </PanelCard>
  );
}

function BarChart({ items, valueKey = 'value' }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 0);

  if (!items.length) {
    return <p className={styles.emptyChart}>Sem dados suficientes.</p>;
  }

  return (
    <div className={styles.chartList}>
      {items.map((item) => {
        const value = Number(item[valueKey] || 0);
        const width = maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%';
        return (
          <div key={item.id || item.label} className={styles.chartRow}>
            <div className={styles.chartRowTop}>
              <span>{item.name || item.label}</span>
              <strong>{value}</strong>
            </div>
            <div className={styles.chartTrack}>
              <span className={styles.chartFill} style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ items }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const palette = ['#2d7a3a', '#1e6b8a', '#f5a623', '#c75d2c', '#6d8c49', '#9ab89f'];
  const background = buildChartGradient(items, palette);

  if (!items.length) {
    return <p className={styles.emptyChart}>Sem dados suficientes.</p>;
  }

  return (
    <div className={styles.donutWrap}>
      <div className={styles.donut} style={{ background }}>
        <div className={styles.donutHole}>
          <strong>{total}</strong>
          <span>registros</span>
        </div>
      </div>

      <div className={styles.legend}>
        {items.map((item, index) => (
          <div key={item.label} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: palette[index % palette.length] }}
            />
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className={styles.detailItem}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
