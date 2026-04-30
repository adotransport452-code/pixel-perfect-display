import { createFileRoute } from "@tanstack/react-router";
import ShipmentDetailsPage from "@/pages/ShipmentDetails";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/shipments/$id")({
  component: () => (
    <AuthGate require="tracking">
      <ShipmentDetailsPage />
    </AuthGate>
  ),
});
