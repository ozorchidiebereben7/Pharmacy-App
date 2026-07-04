import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function ProtectedRoute({ ownerOnly, children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  if (ownerOnly && currentUser.role !== 'owner') return <Navigate to="/dashboard" replace />;
  return children;
}
