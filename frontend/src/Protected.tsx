import { Navigate } from 'react-router-dom';
import { auth } from './auth';

export default function Protected({ children }: { children: React.ReactNode }) {
  return auth.token ? <>{children}</> : <Navigate to="/login" replace />;
}