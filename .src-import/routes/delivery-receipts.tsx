import { createFileRoute } from "@tanstack/react-router";
import DeliveryReceiptsPage from "@/pages/DeliveryReceipts";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/delivery-receipts")({
  component: () => (
    <AuthGate require="settings">
      <DeliveryReceiptsPage />
    </AuthGate>
  ),
});
