import { Navigate } from 'react-router-dom';

/** Página legada — o app usa /login e /register. */
export default function WelcomePage() {
  return <Navigate to="/login" replace />;
}
