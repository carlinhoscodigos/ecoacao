import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Button from '../components/common/Button';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { loginUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handle(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    try {
      const result = await loginUser({ email: form.email, password: form.password });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate('/dashboard');
    } catch (err) {
      console.error('Falha no login:', err);
      setError('Nao foi possivel conectar ao backend. Verifique se a API esta online.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandEmoji}>🌿</span>
          <h1 className={styles.brandName}>Eco Ação</h1>
        </div>

        <h2 className={styles.heading}>Entrar na sua conta</h2>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label}>E-mail</label>
            <input
              className={[styles.input, error ? styles.inputError : ''].join(' ')}
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={(e) => handle('email', e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Senha</label>
            <input
              className={[styles.input, error ? styles.inputError : ''].join(' ')}
              type="password"
              placeholder="••••••"
              value={form.password}
              onChange={(e) => handle('password', e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.errorMsg}>⚠ {error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={loading}>
            {loading ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className={styles.switch}>
          Não tem conta?{' '}
          <Link to="/register" className={styles.link}>Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
