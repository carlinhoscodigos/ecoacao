import styles from './ProgressBar.module.css';

export default function ProgressBar({ value = 0, max = 100, color = 'primary', showLabel = false }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={styles.track}>
      <div
        className={[styles.fill, styles[color]].join(' ')}
        style={{ width: `${pct}%` }}
      />
      {showLabel && <span className={styles.label}>{pct}%</span>}
    </div>
  );
}
