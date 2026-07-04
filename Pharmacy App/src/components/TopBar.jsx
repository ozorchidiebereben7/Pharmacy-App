import { useNavigate } from 'react-router-dom';

export function TopBar({ title, onBack, right }) {
  const navigate = useNavigate();
  return (
    <div className="topbar">
      {onBack !== null && (
        <button className="topbar-back" aria-label="Back" onClick={onBack || (() => navigate(-1))}>
          ←
        </button>
      )}
      <h1 className="topbar-title">{title}</h1>
      {right}
    </div>
  );
}
