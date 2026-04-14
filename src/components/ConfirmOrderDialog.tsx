import { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { formatCOP } from '@/lib/format';
import { toast } from 'sonner';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export default function ConfirmOrderDialog({ open, onOpenChange }: Props) {
  const { items, total, clearCart } = useCart();
  const { perfil } = useAuth();
  const [direccion, setDireccion] = useState(perfil?.direccion ?? '');
  const [observaciones, setObservaciones] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset direccion when dialog opens
  const handleOpenChange = (v: boolean) => {
    if (v) setDireccion(perfil?.direccion ?? '');
    onOpenChange(v);
  };

  const handleConfirm = async () => {
    if (!perfil || !direccion.trim()) {
      toast.error('La dirección de entrega es obligatoria');
      return;
    }
    setSubmitting(true);
    const numero_pedido = `FP-${Date.now()}`;
    const { data: pedido, error: e1 } = await supabase.from('pedidos')
      .insert({ numero_pedido, cliente_id: perfil.id, estado: 'Nuevo', direccion_entrega: direccion.trim(), observaciones: observaciones.trim() || null, total })
      .select().single();

    if (e1 || !pedido) { toast.error('Error al crear el pedido. Intenta de nuevo.'); setSubmitting(false); return; }

    const { error: e2 } = await supabase.from('items_pedido').insert(
      items.map(i => ({ pedido_id: pedido.id, producto_id: i.id, nombre_producto: i.nombre, cantidad: i.cantidad, precio_unitario: i.precio }))
    );
    if (e2) { toast.error('Error al guardar los productos del pedido'); setSubmitting(false); return; }

    await supabase.from('historial_pedido').insert({
      pedido_id: pedido.id, estado_anterior: null, estado_nuevo: 'Nuevo', nota: 'Pedido creado por el cliente', usuario_id: perfil.id,
    });

    toast.success(`Pedido ${numero_pedido} creado exitosamente`);
    clearCart();
    setObservaciones('');
    setSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-heading">Confirmar pedido</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {items.map(i => (
              <div key={i.id} className="flex justify-between text-sm">
                <span>{i.nombre} × {i.cantidad}</span>
                <span className="font-medium">{formatCOP(i.precio * i.cantidad)}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-2">
              <span>Total</span><span>{formatCOP(total)}</span>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección de entrega *</Label>
            <Input value={direccion} onChange={e => setDireccion(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Observaciones (opcional)</Label>
            <Textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Instrucciones especiales…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={submitting || !direccion.trim()}>
            {submitting ? 'Creando pedido…' : 'Hacer pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
