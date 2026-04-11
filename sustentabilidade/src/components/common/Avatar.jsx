import { getInitials } from '../../utils/helpers';
import styles from './Avatar.module.css';

const COLORS = [
  '#2d7a3a','#1e6b8a','#8e44ad','#e67e22','#16a085','#c0392b','#2471a3',
];

function getColor(name) {
  if (!name) return COLORS[0];
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[sum % COLORS.length];
}

export default function Avatar({ name, size = 40 }) {
  const bg = getColor(name);
  return (
    <div
      className={styles.avatar}
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
    >
      {getInitials(name)}
    </div>
  );
}
