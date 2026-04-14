import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/AdminSidebar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export default function DashboardLayout() {
  const { perfil, rol, signOut } = useAuth();

  const rolColor = rol === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-indigo-light text-indigo-deep';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b bg-card px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <span className="font-heading text-lg font-semibold">Compañía Faro</span>
              <span className="hidden sm:inline text-sm text-muted-foreground">· Tech Distribution</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{perfil?.nombre_completo}</span>
              <Badge className={`${rolColor} border-0 capitalize`}>{rol}</Badge>
              <Button variant="ghost" size="icon" onClick={signOut} title="Cerrar sesión">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
