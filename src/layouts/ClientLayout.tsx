import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import CartSheet from '@/components/CartSheet';

export default function ClientLayout() {
  const { perfil, signOut } = useAuth();
  const { totalItems } = useCart();
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);

  const navItems = [
    { label: 'Catálogo', path: '/tienda' },
    { label: 'Mis pedidos', path: '/mis-pedidos' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="h-14 border-b bg-card px-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-6">
          <Link to="/tienda" className="font-heading text-lg font-semibold">Compañía Faro</Link>
          <nav className="flex gap-1">
            {navItems.map(n => (
              <Link key={n.path} to={n.path}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${location.pathname === n.path ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="relative" onClick={() => setCartOpen(true)}>
            <ShoppingCart className="h-5 w-5" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground border-0">
                {totalItems}
              </Badge>
            )}
          </Button>
          <span className="text-sm font-medium hidden sm:inline">{perfil?.nombre_completo}</span>
          <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión"><LogOut className="h-4 w-4" /></Button>
        </div>
      </header>
      <main className="flex-1 p-4 md:p-6">
        <Outlet />
      </main>
      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
