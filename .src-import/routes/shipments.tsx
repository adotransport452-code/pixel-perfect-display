import { createFileRoute, Outlet, useLocation } from "@tanstack/react-router";
import ShipmentsPage from "@/pages/Shipments";
import { AuthGate } from "@/components/AuthGate";

function ShipmentsRouteComponent() {
  const { pathname } = useLocation();
  const isIndex = pathname === "/shipments" || pathname === "/shipments/";
  return (
    <AuthGate require="tracking">
      {isIndex ? <ShipmentsPage /> : <Outlet />}
    </AuthGate>
  );
}

export const Route = createFileRoute("/shipments")({
  component: ShipmentsRouteComponent,
});
