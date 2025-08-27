import { Navigate } from 'react-router-dom';
import { auth } from './auth';
export default function Protected({ children }: { children: JSX.Element }) {
  return auth.token ? children : <Navigate to="/login" replace />;
}