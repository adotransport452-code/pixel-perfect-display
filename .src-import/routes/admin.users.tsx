import { createFileRoute } from "@tanstack/react-router";
import UsersAdminPage from "@/pages/UsersAdmin";
import { AdminOnly } from "@/components/AuthGate";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <AdminOnly>
      <UsersAdminPage />
    </AdminOnly>
  ),
});
