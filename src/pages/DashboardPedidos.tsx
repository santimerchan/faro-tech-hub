import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import EstadoBadge from '@/components/EstadoBadge';
import { formatCOP, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import { Search, Package } from 'lucide-react';

const ESTADOS = ['Nuevo', 'En preparación', 'Despachado', 'Entregado', 'Cancelado'];
const FLUJO = ['Nuevo', 'En preparación', 'Despachado', 'Entregado'];

type Pedido = {
  id: string; numero_pedido: string; estado: string; total: number;
  direccion_entrega: string; observaciones: string | null;
  created_at: string; cliente_id: string; responsable_id: string | null;
  cliente?: { nombre_completo: string; email: string } | null;
  responsable?: { nombre_completo: string } | null;
};

export default function DashboardPedidos() {
  const { perfil } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);
  const [nota, setNota] = useState('');
  const [changing, setChanging] = useState(false);

  const fetchPedidos = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('pedidos')
      .select('*, cliente:perfiles!pedidos_cliente_id_fkey(nombre_completo, email), responsable:perfiles!pedidos_responsable_id_fkey(nombre_completo)')
      .order('created_at', { ascending: false });
    if (err) { setError('Error al cargar pedidos'); setLoading(false); return; }
    setPedidos((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('dashboard-pedidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos' }, () => fetchPedidos())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_pedido' }, () => {
        if (selectedPedido) fetchDetail(selectedPedido.id);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [fetchPedidos, selectedPedido]);

  const fetchDetail = async (pedidoId: string) => {
    const [itemsRes, histRes] = await Promise.all([
      supabase.from('items_pedido').select('*').eq('pedido_id', pedidoId),
      supabase.from('historial_pedido').select('*, usuario:perfiles!historial_pedido_usuario_id_fkey(nombre_completo)').eq('pedido_id', pedidoId).order('created_at', { ascending: true }),
    ]);
    setItems(itemsRes.data ?? []);
    setHistorial(histRes.data ?? []);
  };

  const openDetail = (p: Pedido) => {
    setSelectedPedido(p);
    setNota('');
    fetchDetail(p.id);
  };

  const conteo = ESTADOS.reduce((acc, e) => ({ ...acc, [e]: pedidos.filter(p => p.estado === e).length }), {} as Record<string, number>);

  const filtered = pedidos.filter(p => {
    if (filtroEstado !== 'todos' && p.estado !== filtroEstado) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return p.numero_pedido.toLowerCase().includes(q) || p.cliente?.nombre_completo?.toLowerCase().includes(q);
    }
    return true;
  });

  const nextEstado = selectedPedido ? FLUJO[FLUJO.indexOf(selectedPedido.estado) + 1] : null;
  const canCancel = selectedPedido && !['Entregado', 'Cancelado'].includes(selectedPedido.estado);

  const cambiarEstado = async (nuevoEstado: string) => {
    if (!selectedPedido || !perfil || !nota.trim()) {
      toast.error('La nota es obligatoria para cambiar el estado');
      return;
    }
    setChanging(true);
    const { error: e1 } = await supabase.from('pedidos').update({ estado: nuevoEstado, responsable_id: perfil.id }).eq('id', selectedPedido.id);
    if (e1) { toast.error('Error al actualizar pedido'); setChanging(false); return; }
    const { error: e2 } = await supabase.from('historial_pedido').insert({
      pedido_id: selectedPedido.id, estado_anterior: selectedPedido.estado, estado_nuevo: nuevoEstado, nota: nota.trim(), usuario_id: perfil.id,
    });
    if (e2) { toast.error('Error al registrar historial'); setChanging(false); return; }
    toast.success(`Estado cambiado a "${nuevoEstado}"`);
    setSelectedPedido({ ...selectedPedido, estado: nuevoEstado });
    setNota('');
    setChanging(false);
    fetchPedidos();
    fetchDetail(selectedPedido.id);
  };

  if (error) return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={() => { setError(''); setLoading(true); fetchPedidos(); }}>Reintentar</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-bold">Pedidos</h1>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {ESTADOS.map(e => (
          <Card key={e} className={`cursor-pointer transition hover:ring-2 hover:ring-primary/30 ${filtroEstado === e ? 'ring-2 ring-primary' : ''}`} onClick={() => setFiltroEstado(filtroEstado === e ? 'todos' : e)}>
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-heading font-bold">{loading ? '—' : conteo[e]}</p>
              <p className="text-xs text-muted-foreground">{e}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filtroEstado} onValueChange={setFiltroEstado}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por # pedido o cliente…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>No se encontraron pedidos</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead># Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(p)}>
                  <TableCell className="font-medium">{p.numero_pedido}</TableCell>
                  <TableCell>{p.cliente?.nombre_completo ?? '—'}</TableCell>
                  <TableCell><EstadoBadge estado={p.estado} /></TableCell>
                  <TableCell className="text-right">{formatCOP(p.total)}</TableCell>
                  <TableCell>{p.responsable?.nombre_completo ?? '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Sheet */}
      <Sheet open={!!selectedPedido} onOpenChange={o => !o && setSelectedPedido(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          {selectedPedido && (
            <>
              <SheetHeader>
                <SheetTitle className="font-heading">Pedido {selectedPedido.numero_pedido}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-6">
                {/* Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{selectedPedido.cliente?.nombre_completo}</p></div>
                  <div><span className="text-muted-foreground">Estado:</span><div className="mt-1"><EstadoBadge estado={selectedPedido.estado} /></div></div>
                  <div><span className="text-muted-foreground">Dirección:</span><p>{selectedPedido.direccion_entrega}</p></div>
                  <div><span className="text-muted-foreground">Total:</span><p className="font-bold">{formatCOP(selectedPedido.total)}</p></div>
                  {selectedPedido.observaciones && <div className="col-span-2"><span className="text-muted-foreground">Observaciones:</span><p>{selectedPedido.observaciones}</p></div>}
                </div>

                {/* Items */}
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

                {/* Timeline */}
                <div>
                  <h3 className="font-heading font-semibold mb-2">Historial</h3>
                  {historial.length === 0 ? <p className="text-sm text-muted-foreground">Sin historial</p> : (
                    <div className="space-y-3">
                      {historial.map(h => (
                        <div key={h.id} className="border-l-2 border-primary/30 pl-3 py-1">
                          <p className="text-sm font-medium">
                            {h.estado_anterior ? `${h.estado_anterior} → ${h.estado_nuevo}` : h.estado_nuevo}
                          </p>
                          {h.nota && <p className="text-sm text-muted-foreground">{h.nota}</p>}
                          <p className="text-xs text-muted-foreground">{h.usuario?.nombre_completo} · {formatDate(h.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* State change */}
                {(nextEstado || canCancel) && (
                  <div className="space-y-3 border-t pt-4">
                    <h3 className="font-heading font-semibold">Cambiar estado</h3>
                    <div className="space-y-1">
                      <Label>Nota (obligatoria)</Label>
                      <Textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Describe el motivo del cambio…" />
                    </div>
                    <div className="flex gap-2">
                      {nextEstado && (
                        <Button onClick={() => cambiarEstado(nextEstado)} disabled={changing || !nota.trim()}>
                          Avanzar a "{nextEstado}"
                        </Button>
                      )}
                      {canCancel && (
                        <Button variant="destructive" onClick={() => cambiarEstado('Cancelado')} disabled={changing || !nota.trim()}>
                          Cancelar pedido
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
