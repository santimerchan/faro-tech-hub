import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardLayout from "@/layouts/DashboardLayout";
import ClientLayout from "@/layouts/ClientLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPedidos from "@/pages/DashboardPedidos";
import DashboardProductos from "@/pages/DashboardProductos";
import TiendaPage from "@/pages/TiendaPage";
import MisPedidosPage from "@/pages/MisPedidosPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/registro" element={<RegisterPage />} />

              {/* Admin / Operaciones */}
              <Route path="/dashboard" element={
                <ProtectedRoute allowedRoles={['admin', 'operaciones']}>
                  <DashboardLayout />
                </ProtectedRoute>
              }>
                <Route index element={<DashboardPedidos />} />
                <Route path="productos" element={<DashboardProductos />} />
              </Route>

              {/* Cliente */}
              <Route path="/" element={
                <ProtectedRoute allowedRoles={['cliente']}>
                  <ClientLayout />
                </ProtectedRoute>
              }>
                <Route path="tienda" element={<TiendaPage />} />
                <Route path="mis-pedidos" element={<MisPedidosPage />} />
                <Route index element={<Navigate to="/tienda" replace />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
