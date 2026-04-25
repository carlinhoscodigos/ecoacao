import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Avatar from '../common/Avatar';
import styles from './Header.module.css';

export default function Header() {
  const { currentUser, logout } = useApp();
  const location = useLocation();

  if (!currentUser) return null;

  return (
    <header className={styles.header}>
      <Link to="/dashboard" className={styles.brand}>
        <span className={styles.logo}>🌿</span>
        <span className={styles.brandName}>Eco Ação</span>
      </Link>

      <nav className={styles.nav}>
        <NavLink to="/dashboard" label="Início" icon="🏠" active={location.pathname === '/dashboard'} />
        <NavLink to="/acoes" label="Ações" icon="✅" active={location.pathname === '/acoes'} />
        <NavLink to="/ranking" label="Ranking" icon="🏆" active={location.pathname === '/ranking'} />
        <NavLink to="/sobre" label="Sobre" icon="🔬" active={location.pathname === '/sobre'} />
      </nav>

      <div className={styles.userArea}>
        <Avatar name={currentUser.name} size={34} />
        <span className={styles.userName}>{currentUser.name.split(' ')[0]}</span>
        <button className={styles.logoutBtn} onClick={logout} title="Sair">
          ↩
        </button>
      </div>
    </header>
  );
}

function NavLink({ to, label, icon, active }) {
  return (
    <Link to={to} className={[styles.navLink, active ? styles.active : ''].join(' ')}>
      <span className={styles.navIcon}>{icon}</span>
      <span className={styles.navLabel}>{label}</span>
    </Link>
  );
}
