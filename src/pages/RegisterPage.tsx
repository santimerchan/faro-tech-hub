import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function RegisterPage() {
  const { user, rol, loading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nombre_completo: '', telefono: '', direccion: '', email: '', password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!loading && user && rol) {
    return <Navigate to={rol === 'cliente' ? '/tienda' : '/dashboard'} replace />;
  }

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.nombre_completo.trim()) errs.nombre_completo = 'Requerido';
    if (!form.telefono.trim()) errs.telefono = 'Requerido';
    if (!form.direccion.trim()) errs.direccion = 'Requerido';
    if (!form.email.trim()) errs.email = 'Requerido';
    if (form.password.length < 6) errs.password = 'Mínimo 6 caracteres';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Las contraseñas no coinciden';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          nombre_completo: form.nombre_completo,
          telefono: form.telefono,
          direccion: form.direccion,
        },
      },
    });
    if (error) {
      toast.error(error.message.includes('already') ? 'Este email ya está registrado' : 'Error al registrar. Intenta de nuevo.');
      setSubmitting(false);
    } else {
      toast.success('Cuenta creada exitosamente. Inicia sesión.');
      navigate('/login');
    }
  };

  const Field = ({ id, label, type = 'text', placeholder = '' }: { id: string; label: string; type?: string; placeholder?: string }) => (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} required value={(form as any)[id]} onChange={set(id)} placeholder={placeholder} />
      {errors[id] && <p className="text-xs text-destructive">{errors[id]}</p>}
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-heading">Crear cuenta</CardTitle>
          <CardDescription>Compañía Faro · Tech Distribution</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Field id="nombre_completo" label="Nombre completo" placeholder="Tu nombre" />
            <Field id="telefono" label="Teléfono" placeholder="+57 300 000 0000" />
            <Field id="direccion" label="Dirección" placeholder="Tu dirección de entrega" />
            <Field id="email" label="Email" type="email" placeholder="tu@email.com" />
            <div className="space-y-1">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input id="password" type={showPass ? 'text' : 'password'} required value={form.password} onChange={set('password')} placeholder="Mínimo 6 caracteres" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setShowPass(!showPass)}>
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>
            <Field id="confirmPassword" label="Confirmar contraseña" type="password" placeholder="Repite la contraseña" />
            <Button type="submit" className="w-full" disabled={submitting}>
              <UserPlus className="mr-2 h-4 w-4" /> {submitting ? 'Registrando…' : 'Registrarse'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-primary underline-offset-4 hover:underline">Inicia sesión</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
