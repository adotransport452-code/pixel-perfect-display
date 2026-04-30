import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGate, AdminOnly } from "@/components/AuthGate";
import { AppLayout } from "@/components/AppLayout";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Stations from "./pages/Stations";
import Clients from "./pages/Clients";
import Consignments from "./pages/Consignments";
import Shipments from "./pages/Shipments";
import ShipmentDetails from "./pages/ShipmentDetails";
import Payments from "./pages/Payments";
import DeliveryReceipts from "./pages/DeliveryReceipts";
import UsersAdmin from "./pages/UsersAdmin";
import OverallDetails from "./pages/OverallDetails";
import TrackingSystem from "./pages/TrackingSystem";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<AuthGate require="dashboard"><Index /></AuthGate>} />
                    <Route path="/stations" element={<AuthGate require="settings"><Stations /></AuthGate>} />
                    <Route path="/clients" element={<AuthGate require="settings"><Clients /></AuthGate>} />
                    <Route path="/consignments" element={<AuthGate require="reports"><Consignments /></AuthGate>} />
                    <Route path="/shipments" element={<AuthGate require="tracking"><Shipments /></AuthGate>} />
                    <Route path="/shipments/:id" element={<AuthGate require="tracking"><ShipmentDetails /></AuthGate>} />
                    <Route path="/payments" element={<AuthGate require="billing"><Payments /></AuthGate>} />
                    <Route path="/delivery-receipts" element={<AuthGate require="settings"><DeliveryReceipts /></AuthGate>} />
                    <Route path="/overall-details" element={<AuthGate require="tracking"><OverallDetails /></AuthGate>} />
                    <Route path="/admin/users" element={<AdminOnly><UsersAdmin /></AdminOnly>} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </AppLayout>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
