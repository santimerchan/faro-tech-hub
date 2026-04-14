import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const { user, rol, loading, refreshSession } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!loading && user && rol) {
    return <Navigate to={rol === 'cliente' ? '/tienda' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data: signData, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else {
        // Pasar la sesión del login evita una condición de carrera: getSession()
        // a veces aún no ve la sesión recién creada y el SELECT a perfiles va sin JWT.
        const { rol: r, perfilErrorCode, perfilErrorMessage } = await refreshSession(
          signData.session ?? undefined
        );
        if (r) {
          toast.success('Sesión iniciada correctamente');
          navigate(r === 'cliente' ? '/tienda' : '/dashboard', { replace: true });
        } else {
          const supabaseHost = import.meta.env.VITE_SUPABASE_URL ?? '';
          const hintProyecto =
            'Confirma que ejecutaste el SQL en el mismo proyecto que tu .env (URL: ' +
            supabaseHost +
            '). ';
          if (perfilErrorCode === 'PGRST116') {
            toast.error(
              hintProyecto +
                'No hay fila en public.perfiles con id = tu UUID de Authentication, o el id no coincide.'
            );
          } else {
            toast.error(
              hintProyecto +
                (perfilErrorMessage ??
                  'No se pudo leer perfiles (¿RLS?). Detalle: ' + (perfilErrorCode ?? 'desconocido'))
            );
          }
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">Compañía Faro</CardTitle>
          <CardDescription>Tech Distribution · Iniciar sesión</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input id="password" type={showPass ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              <LogIn className="mr-2 h-4 w-4" /> {submitting ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{' '}
            <Link to="/registro" className="text-primary underline-offset-4 hover:underline">Regístrate aquí</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
