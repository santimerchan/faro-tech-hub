-- =============================================================================
-- Limpia perfiles duplicados / huérfanos y alinea rol admin con Auth
-- Ejecutar en Supabase → SQL Editor (una vez).
-- =============================================================================

-- 1) Borrar filas en public.perfiles cuyo id NO existe en auth.users.
--    Suele ser la causa del "mismo email, dos UUID": solo uno es tu login real.
--    Si este DELETE falla por FK (pedidos apuntan a ese id), antes ejecuta:
--    DELETE FROM public.items_pedido WHERE pedido_id IN (...);
--    o borra los pedidos de ese cliente en Table Editor.
DELETE FROM public.perfiles AS p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users AS u WHERE u.id = p.id
);

-- 2) Dejar explícito admin en el perfil que coincide con tu usuario de Auth.
UPDATE public.perfiles AS pf
SET
  rol = 'admin',
  activo = true,
  email = u.email
FROM auth.users AS u
WHERE pf.id = u.id
  AND u.email = 'smerchanmontoya@gmail.com';
