import styles from './EmptyState.module.css';

export default function EmptyState({ icon = '🌱', title, description, children }) {
  return (
    <div className={styles.container}>
      <div className={styles.icon}>{icon}</div>
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}
