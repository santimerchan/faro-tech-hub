import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCart } from '@/contexts/CartContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCOP } from '@/lib/format';
import { toast } from 'sonner';
import { Search, Plus, Minus, ShoppingCart, Package } from 'lucide-react';

const CATEGORIAS = ['Periféricos', 'Audio', 'Almacenamiento', 'Accesorios', 'Monitores', 'Energía'];

const categoryIcons: Record<string, string> = {
  'Periféricos': '🖱️', 'Audio': '🎧', 'Almacenamiento': '💾', 'Accesorios': '🔌', 'Monitores': '🖥️', 'Energía': '🔋',
};

type Producto = {
  id: string; nombre: string; descripcion: string | null; categoria: string;
  precio: number; stock: number; imagen_url: string | null; activo: boolean;
};

export default function TiendaPage() {
  const { addItem } = useCart();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCat, setFiltroCat] = useState('todas');
  const [cantidades, setCantidades] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchProductos = async () => {
      const { data, error: err } = await supabase.from('productos').select('*').eq('activo', true).order('nombre');
      if (err) { setError('Error al cargar el catálogo'); setLoading(false); return; }
      setProductos(data ?? []);
      setLoading(false);
    };
    fetchProductos();
  }, []);

  const filtered = productos.filter(p => {
    if (filtroCat !== 'todas' && p.categoria !== filtroCat) return false;
    if (busqueda) return p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    return true;
  });

  const getCant = (id: string) => cantidades[id] ?? 1;
  const setCant = (id: string, v: number) => setCantidades(prev => ({ ...prev, [id]: Math.max(1, v) }));

  const handleAdd = (p: Producto) => {
    addItem({ id: p.id, nombre: p.nombre, precio: p.precio, imagen_url: p.imagen_url, categoria: p.categoria }, getCant(p.id));
    toast.success(`${p.nombre} agregado al carrito`);
    setCant(p.id, 1);
  };

  if (error) return (
    <div className="text-center py-12">
      <p className="text-destructive mb-4">{error}</p>
      <Button onClick={() => window.location.reload()}>Reintentar</Button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-heading font-bold">Catálogo</h1>

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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Package className="mx-auto h-12 w-12 mb-2 opacity-40" />
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Card key={p.id} className="overflow-hidden group hover:ring-2 hover:ring-primary/20 transition">
              <div className="aspect-[4/3] bg-muted flex items-center justify-center text-5xl">
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                ) : (
                  <span>{categoryIcons[p.categoria] ?? '📦'}</span>
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-1 text-xs">{p.categoria}</Badge>
                    <h3 className="font-heading font-semibold leading-tight">{p.nombre}</h3>
                  </div>
                </div>
                {p.descripcion && <p className="text-sm text-muted-foreground line-clamp-2">{p.descripcion}</p>}
                <p className="text-lg font-heading font-bold text-primary">{formatCOP(p.precio)}</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded-md">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCant(p.id, getCant(p.id) - 1)} disabled={getCant(p.id) <= 1}><Minus className="h-3 w-3" /></Button>
                    <span className="w-8 text-center text-sm">{getCant(p.id)}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCant(p.id, getCant(p.id) + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <Button className="flex-1" size="sm" onClick={() => handleAdd(p)}>
                    <ShoppingCart className="mr-1 h-4 w-4" /> Agregar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
