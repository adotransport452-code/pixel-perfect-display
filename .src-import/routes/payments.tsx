import { createFileRoute } from "@tanstack/react-router";
import PaymentsPage from "@/pages/Payments";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/payments")({
  component: () => (
    <AuthGate require="billing">
      <PaymentsPage />
    </AuthGate>
  ),
});
