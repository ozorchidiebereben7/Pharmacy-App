import { avatarColorFor, initialsFor } from '../lib/avatarColor';

export function Avatar({ name, size = 36 }) {
  const { bg, fg } = avatarColorFor(name);
  return (
    <span
      className="avatar-chip"
      style={{ width: size, height: size, minWidth: size, background: bg, color: fg, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initialsFor(name)}
    </span>
  );
}
