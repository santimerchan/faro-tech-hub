import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authDebug } from '@/lib/authDebug';
import type { Session, User } from '@supabase/supabase-js';

type Perfil = {
  id: string;
  email: string;
  nombre_completo: string;
  rol: string;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
};

type AuthContextType = {
  user: User | null;
  perfil: Perfil | null;
  rol: string | null;
  loading: boolean;
  /**
   * Vuelve a leer sesión + fila en `perfiles`.
   * Tras `signInWithPassword`, pasa `session` del response para evitar que `getSession()` vaya una milésima antes que el cliente guarde la sesión.
   */
  refreshSession: (sessionOverride?: Session | null) => Promise<{
    rol: string | null;
    perfilErrorCode?: string;
    perfilErrorMessage?: string;
  }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  perfil: null,
  rol: null,
  loading: true,
  refreshSession: async () => ({ rol: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPerfil = useCallback(
    async (
      userId: string
    ): Promise<{
      perfil: Perfil | null;
      errorCode?: string;
      errorMessage?: string;
    }> => {
      try {
        const { data, error } = await supabase
          .from('perfiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) {
          authDebug('perfiles.select.error', {
            userId,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
          });
          setPerfil(null);
          return {
            perfil: null,
            errorCode: error.code,
            errorMessage: error.message,
          };
        }
        if (data) {
          const p = data as Perfil;
          authDebug('perfiles.select.ok', { userId, rol: p.rol, email: p.email });
          setPerfil(p);
          return { perfil: p };
        }
        setPerfil(null);
        authDebug('perfiles.select.empty', { userId });
        return { perfil: null, errorCode: 'EMPTY', errorMessage: 'Sin fila en perfiles' };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const refreshSession = useCallback(
    async (
      sessionOverride?: Session | null
    ): Promise<{
      rol: string | null;
      perfilErrorCode?: string;
      perfilErrorMessage?: string;
    }> => {
      const { data: fresh } = await supabase.auth.getSession();
      const session = sessionOverride ?? fresh.session;
      const u = session?.user ?? null;
      authDebug('refreshSession', {
        sessionSource: sessionOverride ? 'signIn_override' : 'getSession',
        userId: u?.id ?? null,
        email: u?.email ?? null,
        hasOverride: Boolean(sessionOverride),
        hasFreshSession: Boolean(fresh.session),
      });
      setUser(u);
      if (!u) {
        setPerfil(null);
        setLoading(false);
        authDebug('refreshSession.no_user');
        return { rol: null, perfilErrorCode: 'NO_SESSION', perfilErrorMessage: 'Sin sesión' };
      }
      const { perfil: p, errorCode, errorMessage } = await fetchPerfil(u.id);
      if (!p) {
        authDebug('refreshSession.no_perfil', { errorCode, errorMessage });
        return {
          rol: null,
          perfilErrorCode: errorCode,
          perfilErrorMessage: errorMessage,
        };
      }
      authDebug('refreshSession.ok', { rol: p.rol });
      return { rol: p.rol };
    },
    [fetchPerfil]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          setTimeout(() => void fetchPerfil(u.id), 0);
        } else {
          setPerfil(null);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        void fetchPerfil(u.id);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPerfil]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setPerfil(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, perfil, rol: perfil?.rol ?? null, loading, refreshSession, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
