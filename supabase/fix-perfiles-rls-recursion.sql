-- =============================================================================
-- Corrige: infinite recursion detected in policy for relation "perfiles"
--
-- Causa: policies que hacen EXISTS (SELECT ... FROM public.perfiles ...) sobre
-- la misma tabla "perfiles"; cada subconsulta vuelve a aplicar RLS → recursión.
--
-- Solución: función SECURITY DEFINER (dueño bypass RLS) que solo lee el rol del
-- usuario actual. Luego las policies usan esa función en lugar del EXISTS.
-- Ejecutar en Supabase → SQL Editor (mismo proyecto que tu .env).
-- =============================================================================

-- Quitar TODAS las policies de public.perfiles (evita "policy already exists"
-- si ejecutaste solo la mitad del script o los nombres no coincidían).
DO $$
DECLARE
  pol text;
BEGIN
  FOR pol IN
    SELECT p.policyname
    FROM pg_policies AS p
    WHERE p.schemaname = 'public'
      AND p.tablename = 'perfiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.perfiles', pol);
  END LOOP;
END $$;

-- Función estable: rol del usuario autenticado (sin recursión de RLS)
CREATE OR REPLACE FUNCTION public.current_perfil_rol()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT p.rol
  FROM public.perfiles AS p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.current_perfil_rol() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_perfil_rol() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_perfil_rol() TO service_role;

-- SELECT: la propia fila, o admin/operaciones (cualquier fila)
CREATE POLICY "perfiles_select"
  ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.current_perfil_rol() IN ('admin', 'operaciones')
  );

-- INSERT: solo fila propia
CREATE POLICY "perfiles_insert"
  ON public.perfiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: la propia fila, o admin sobre cualquiera
CREATE POLICY "perfiles_update"
  ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = id
    OR public.current_perfil_rol() = 'admin'
  )
  WITH CHECK (
    auth.uid() = id
    OR public.current_perfil_rol() = 'admin'
  );
