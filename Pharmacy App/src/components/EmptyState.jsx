export function EmptyState({ icon = '📭', title, message }) {
  return (
    <div className="empty-state" role="status">
      <div className="icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}
