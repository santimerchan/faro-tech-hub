import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/format';
import { Trash2, Minus, Plus, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import ConfirmOrderDialog from '@/components/ConfirmOrderDialog';

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export default function CartSheet({ open, onOpenChange }: Props) {
  const { items, removeItem, updateQuantity, total, totalItems } = useCart();
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle className="font-heading">Carrito ({totalItems})</SheetTitle>
          </SheetHeader>
          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingBag className="h-12 w-12 mb-2 opacity-40" />
              <p>Tu carrito está vacío</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 mt-4">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 bg-muted/50 rounded-lg p-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.nombre}</p>
                      <p className="text-sm text-muted-foreground">{formatCOP(item.precio)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.cantidad - 1)} disabled={item.cantidad <= 1}><Minus className="h-3 w-3" /></Button>
                      <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.cantidad + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <p className="text-sm font-bold w-24 text-right">{formatCOP(item.precio * item.cantidad)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 mt-4 space-y-3">
                <div className="flex justify-between font-heading font-bold text-lg">
                  <span>Total</span><span>{formatCOP(total)}</span>
                </div>
                <Button className="w-full" onClick={() => { onOpenChange(false); setConfirmOpen(true); }}>Confirmar pedido</Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <ConfirmOrderDialog open={confirmOpen} onOpenChange={setConfirmOpen} />
    </>
  );
}
