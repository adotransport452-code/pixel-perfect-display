import { createFileRoute } from "@tanstack/react-router";
import StationsPage from "@/pages/Stations";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/stations")({
  component: () => (
    <AuthGate require="settings">
      <StationsPage />
    </AuthGate>
  ),
});
