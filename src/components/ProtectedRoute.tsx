import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

type Props = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: Props) {
  const { user, rol, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Si hay rol restringido y aún no hay `rol`, no abrir la ruta (evita pantallas
  // colgadas en páginas que hacen `if (!perfil) return` sin bajar loading).
  if (allowedRoles && !rol) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(rol!)) {
    if (rol === 'cliente') return <Navigate to="/tienda" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
