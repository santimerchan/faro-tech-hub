-- Ejecutar en Supabase → SQL Editor (como postgres; no aplica RLS).
--
-- La app lee el rol desde public.perfiles. Crear el usuario solo en
-- Authentication → Users NO inserta aquí; por eso el login "funciona" en
-- Supabase pero la web no redirige hasta exista esta fila.
--
-- Ajusta id/email si tu usuario admin es otro (id = UUID en Authentication).

INSERT INTO public.perfiles (id, email, nombre_completo, rol, activo)
VALUES (
  'f4b47694-f487-4687-8621-10d5e0b1eac6',
  'smerchanmontoya@gmail.com',
  'Administrador',
  'admin',
  true
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre_completo = EXCLUDED.nombre_completo,
  rol = EXCLUDED.rol,
  activo = EXCLUDED.activo;
