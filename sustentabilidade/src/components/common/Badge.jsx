import styles from './Badge.module.css';

export default function Badge({ children, color = 'green', size = 'sm' }) {
  return (
    <span className={[styles.badge, styles[color], styles[size]].join(' ')}>
      {children}
    </span>
  );
}
