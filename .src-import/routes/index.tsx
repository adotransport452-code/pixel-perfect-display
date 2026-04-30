import { createFileRoute } from "@tanstack/react-router";
import IndexPage from "@/pages/Index";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/")({
  component: () => (
    <AuthGate require="dashboard">
      <IndexPage />
    </AuthGate>
  ),
});
