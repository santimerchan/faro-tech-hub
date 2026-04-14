import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';
import { toast } from 'sonner';
import { Plus, Pencil, Search, ShoppingBag } from 'lucide-react';

const CATEGORIAS = ['Periféricos', 'Audio', 'Almacenamiento', 'Accesorios', 'Monitores', 'Energía'];

type Producto = {
  id: string; nombre: string; descripcion: string | null; categoria: string;
  precio: number; stock: number; imagen_url: string | null; activo: boolean;
};

const emptyProduct: Omit<Producto, 'id'> = {
  nombre: '', descripcion: '', categoria: 'Periféricos', precio: 0, stock: 0, imagen_url: '', activo: true,
};

export default function DashboardProductos() {
  const { rol } = useAuth();
  const isAdmin = rol === 'admin';
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyProduct);
  const [saving, setSaving] = useState(false);

  const fetchProductos = useCallback(async () => {
    const { data, error: err } = await supabase.from('productos').select('*').order('nombre');
    if (err) { setError('Error al cargar productos'); setLoading(false); return; }
    setProductos(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const filtered = productos.filter(p => {
    if (filtroCat !== 'todas' && p.categoria !== filtroCat) return false;
    if (busqueda) return p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return true;
  });

  const openAdd = () => { setEditingId(null); setForm(emptyProduct); setModalOpen(true); };
  const openEdit = (p: Producto) => {
    setEditingId(p.id);
    setForm({ nombre: p.nombre, descripcion: p.descripcion ?? '', categoria: p.categoria, precio: p.precio, stock: p.stock, imagen_url: p.imagen_url ?? '', activo: p.activo });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || form.precio < 0 || form.stock < 0) {
      toast.error('Revisa los campos obligatorios');
      return;
    }
    setSaving(true);
    const payload = { nombre: form.nombre.trim(), descripcion: form.descripcion || null, categoria: form.categoria, precio: form.precio, stock: form.stock, imagen_url: form.imagen_url || null, activo: form.activo };
    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('productos').update(payload).eq('id', editingId));
    } else {
      ({ error: err } = await supabase.from('productos').insert(payload));
    }
    if (err) { toast.error('Error al guardar producto'); setSaving(false); return; }
    toast.success(editingId ? 'Producto actualizado' : 'Producto creado');
    setModalOpen(false);
    setSaving(false);
    fetchProductos();
  };

  const toggleActivo = async (p: Producto) => {
    const { error: err } = await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id);
    if (err) { toast.error('Error al cambiar estado'); return; }
    fetchProductos();
  };

  if (error) return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={() => { setError(''); setLoading(true); fetchProductos(); }}>Reintentar</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Catálogo de Productos</h1>
        {isAdmin && <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Agregar producto</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={filtroCat} onValueChange={setFiltroCat}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las categorías</SelectItem>
            {CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar producto…" value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShoppingBag className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead>Estado</TableHead>
                {isAdmin && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nombre}</TableCell>
                  <TableCell><Badge variant="secondary">{p.categoria}</Badge></TableCell>
                  <TableCell className="text-right">{formatCOP(p.precio)}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell>
                    <Badge className={`border-0 ${p.activo ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {p.activo ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleActivo(p)}>{p.activo ? 'Desactivar' : 'Activar'}</Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">{editingId ? 'Editar producto' : 'Nuevo producto'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={form.descripcion ?? ''} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>Categoría *</Label>
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Precio *</Label><Input type="number" min={0} value={form.precio} onChange={e => setForm(f => ({ ...f, precio: Number(e.target.value) }))} /></div>
              <div className="space-y-1"><Label>Stock *</Label><Input type="number" min={0} value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} /></div>
            </div>
            <div className="space-y-1"><Label>URL de imagen</Label><Input value={form.imagen_url ?? ''} onChange={e => setForm(f => ({ ...f, imagen_url: e.target.value }))} /></div>
            <div className="flex items-center gap-2">
              <Checkbox id="activo" checked={form.activo} onCheckedChange={c => setForm(f => ({ ...f, activo: !!c }))} />
              <Label htmlFor="activo">Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
