import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/common/Button';
import { useAdmin } from '../context/AdminContext.jsx';
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
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.kicker}>Painel administrativo</span>
          <h1 className={styles.title}>Acesso restrito</h1>
          <p className={styles.subtitle}>
            Entre com a conta de administrador para gerenciar usuarios, ranking e relatorios.
          </p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            <span>E-mail</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => handle('email', event.target.value)}
              placeholder="admin@email.com"
              autoComplete="email"
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span>Senha</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => handle('password', event.target.value)}
              placeholder="Sua senha administrativa"
              autoComplete="current-password"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar no admin'}
          </Button>
        </form>

        <div className={styles.footer}>
          <span>Fluxo normal do aplicativo:</span>
          <Link to="/login" className={styles.link}>
            voltar para login de usuarios
          </Link>
        </div>
      </div>
    </div>
  );
}
