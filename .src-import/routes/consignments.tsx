import { createFileRoute } from "@tanstack/react-router";
import ConsignmentsPage from "@/pages/Consignments";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/consignments")({
  component: () => (
    <AuthGate require="reports">
      <ConsignmentsPage />
    </AuthGate>
  ),
});
