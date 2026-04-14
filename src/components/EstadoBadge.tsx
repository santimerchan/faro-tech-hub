import { Badge } from '@/components/ui/badge';

const colorMap: Record<string, string> = {
  Nuevo: 'bg-muted text-muted-foreground',
  'En preparación': 'bg-amber text-amber-foreground',
  Despachado: 'bg-primary text-primary-foreground',
  Entregado: 'bg-success text-success-foreground',
  Cancelado: 'bg-destructive text-destructive-foreground',
};

export default function EstadoBadge({ estado }: { estado: string }) {
  return (
    <Badge className={`${colorMap[estado] ?? 'bg-muted text-muted-foreground'} border-0`}>
      {estado}
    </Badge>
  );
}
