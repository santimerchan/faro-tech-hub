/** Logs solo en `npm run dev` (no en build de producción). */
export function authDebug(step: string, payload?: Record<string, unknown>) {
  if (!import.meta.env.DEV) return;
  const line = payload ? { step, ...payload } : { step };
  console.debug('[Faro Auth]', line);
}
