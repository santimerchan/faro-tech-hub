import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EstadoBadge from '@/components/EstadoBadge';
import { formatCOP, formatDate } from '@/lib/format';
import { Package } from 'lucide-react';

export default function MisPedidosPage() {
  const { perfil } = useAuth();
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);

  const fetchPedidos = useCallback(async () => {
    if (!perfil?.id) {
      setLoading(false);
      setError('No hay perfil de cliente cargado. Cierra sesión y entra con una cuenta cliente, o usa el panel admin para ver todos los pedidos.');
      return;
    }
    setError('');
    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*')
      .eq('cliente_id', perfil.id)
      .order('created_at', { ascending: false });
    if (import.meta.env.DEV && err) {
      console.debug('[Faro MisPedidos]', 'pedidos.select', { code: err.code, message: err.message, details: err.details });
    }
    if (err) {
      setError(`Error al cargar pedidos (${err.code ?? 'unknown'}): ${err.message}`);
      setLoading(false);
      return;
    }
    setPedidos(data ?? []);
    setLoading(false);
  }, [perfil]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('mis-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchPedidos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_pedido' }, () => {
        if (selected) fetchDetail(selected.id);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchPedidos, selected]);

  const fetchDetail = async (pedidoId: string) => {
    const [itemsRes, histRes] = await Promise.all([
      supabase.from('items_pedido').select('*').eq('pedido_id', pedidoId),
      supabase.from('historial_pedido').select('*, usuario:perfiles!historial_pedido_usuario_id_fkey(nombre_completo)').eq('pedido_id', pedidoId).order('created_at', { ascending: true }),
    ]);
    setItems(itemsRes.data ?? []);
    setHistorial(histRes.data ?? []);
  };

  const openDetail = (p: any) => { setSelected(p); fetchDetail(p.id); };

  if (error) return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={() => { setError(''); setLoading(true); fetchPedidos(); }}>Reintentar</Button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold">Mis Pedidos</h1>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : pedidos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>Aún no tienes pedidos. ¡Explora el catálogo!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidos.map(p => (
            <Card key={p.id} className="hover:ring-2 hover:ring-primary/20 transition cursor-pointer" onClick={() => openDetail(p)}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-heading font-semibold">{p.numero_pedido}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(p.created_at)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <EstadoBadge estado={p.estado} />
                  <p className="font-bold">{formatCOP(p.total)}</p>
                  <Button variant="outline" size="sm">Ver detalle</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">Pedido {selected.numero_pedido}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Estado:</span><div className="mt-1"><EstadoBadge estado={selected.estado} /></div></div>
                  <div><span className="text-muted-foreground">Total:</span><p className="font-bold">{formatCOP(selected.total)}</p></div>
                  <div><span className="text-muted-foreground">Dirección:</span><p>{selected.direccion_entrega}</p></div>
                  <div><span className="text-muted-foreground">Fecha:</span><p>{formatDate(selected.created_at)}</p></div>
                  {selected.observaciones && <div className="col-span-2"><span className="text-muted-foreground">Observaciones:</span><p>{selected.observaciones}</p></div>}
                </div>

                <div>
                  <h3 className="font-heading font-semibold mb-2">Productos</h3>
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Producto</TableHead><TableHead className="text-center">Cant.</TableHead><TableHead className="text-right">P.Unit</TableHead><TableHead className="text-right">Subtotal</TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {items.map(i => (
                        <TableRow key={i.id}>
                          <TableCell>{i.nombre_producto}</TableCell>
                          <TableCell className="text-center">{i.cantidad}</TableCell>
                          <TableCell className="text-right">{formatCOP(i.precio_unitario)}</TableCell>
                          <TableCell className="text-right">{formatCOP(i.subtotal ?? i.precio_unitario * i.cantidad)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-heading font-semibold mb-2">Historial</h3>
                  {historial.length === 0 ? <p className="text-sm text-muted-foreground">Sin historial</p> : (
                    <div className="space-y-3">
                      {historial.map(h => (
                        <div key={h.id} className="border-l-2 border-primary/30 pl-3 py-1">
                          <p className="text-sm font-medium">{h.estado_anterior ? `${h.estado_anterior} → ${h.estado_nuevo}` : h.estado_nuevo}</p>
                          {h.nota && <p className="text-sm text-muted-foreground">{h.nota}</p>}
                          <p className="text-xs text-muted-foreground">{h.usuario?.nombre_completo} · {formatDate(h.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
