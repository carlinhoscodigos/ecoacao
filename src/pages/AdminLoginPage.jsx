import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { useAdmin } from '../context/AdminContext.jsx';
import authStyles from './AuthPage.module.css';
import styles from './AdminLoginPage.module.css';

export default function AdminLoginPage() {
  const { loginAdmin } = useAdmin();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handle(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.email.trim() || !form.password) {
      setError('Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    const result = await loginAdmin(form);
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    navigate('/admin', { replace: true });
  }

  return (
    <div className={authStyles.page}>
      <div className={authStyles.card} style={{ maxWidth: 460 }}>
        <div className={authStyles.brand}>
          <span className={authStyles.brandEmoji}>🌿</span>
          <h1 className={authStyles.brandName}>Eco Ação</h1>
        </div>

        <span className={styles.adminKicker}>Painel administrativo</span>
        <h2 className={authStyles.heading}>Acesso restrito</h2>
        <p className={styles.lead}>
          Entre com a conta de administrador para gerir utilizadores, ranking e relatórios.
        </p>

        <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
          <div className={authStyles.field}>
            <label className={authStyles.label} htmlFor="admin-email">
              E-mail
            </label>
            <input
              id="admin-email"
              className={[authStyles.input, error ? authStyles.inputError : ''].join(' ')}
              type="email"
              value={form.email}
              onChange={(event) => handle('email', event.target.value)}
              placeholder="admin@email.com"
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={authStyles.field}>
            <label className={authStyles.label} htmlFor="admin-password">
              Senha
            </label>
            <input
              id="admin-password"
              className={[authStyles.input, error ? authStyles.inputError : ''].join(' ')}
              type="password"
              value={form.password}
              onChange={(event) => handle('password', event.target.value)}
              placeholder="••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <p className={authStyles.errorMsg}>⚠ {error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar no admin'}
          </Button>
        </form>

        <p className={authStyles.switch}>
          <span className={styles.footerNote}>Fluxo normal do aplicativo: </span>
          <Link to="/login" className={authStyles.link}>
            voltar ao login de utilizadores
          </Link>
        </p>
      </div>
    </div>
  );
}
