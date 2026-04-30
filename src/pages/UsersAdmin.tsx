import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} from "@/lib/admin";
import type { Permissions, Role } from "@/contexts/AuthContext";
import { useAuth } from "@/contexts/AuthContext";

type Row = {
  user_id: string;
  name: string;
  email: string;
  disabled: boolean;
  role: Role | null;
  permissions: Permissions;
  created_at: string;
};

const PERM_KEYS: { key: keyof Permissions; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "tracking", label: "Tracking (Shipments)" },
  { key: "reports", label: "Reports (Consignments)" },
  { key: "billing", label: "Billing (Payments)" },
  { key: "settings", label: "Settings (Stations & Receipts)" },
];

const emptyPerms: Permissions = {
  dashboard: true,
  tracking: false,
  reports: false,
  billing: false,
  settings: false,
};

export default function UsersAdminPage() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "staff" as Role,
    disabled: false,
    permissions: { ...emptyPerms },
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listUsers();
      setRows(Array.isArray(data) ? (data as Row[]) : []);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load users");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const startCreate = () => {
    setEditRow(null);
    setForm({
      name: "",
      email: "",
      password: "",
      role: "staff",
      disabled: false,
      permissions: { ...emptyPerms },
    });
    setOpen(true);
  };

  const startEdit = (row: Row) => {
    setEditRow(row);
    setForm({
      name: row.name,
      email: row.email,
      password: "",
      role: row.role ?? "staff",
      disabled: row.disabled,
      permissions: { ...row.permissions },
    });
    setOpen(true);
  };

  const submit = async () => {
    try {
      if (editRow) {
        await updateUser({
          data: {
            userId: editRow.user_id,
            name: form.name,
            role: form.role,
            permissions: form.permissions,
            disabled: form.disabled,
            password: form.password || undefined,
          },
        });
        toast.success("User updated");
      } else {
        await createUser({
          data: {
            name: form.name,
            email: form.email,
            password: form.password,
            role: form.role,
            permissions: form.permissions,
          },
        });
        toast.success("User created");
      }
      setOpen(false);
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Operation failed");
    }
  };

  const remove = async (row: Row) => {
    try {
      await deleteUser({ data: { userId: row.user_id } });
      toast.success("User deleted");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const togglePerm = (k: keyof Permissions, v: boolean) =>
    setForm((f) => ({ ...f, permissions: { ...f.permissions, [k]: v } }));

  const roleBadge = (r: Role | null) => {
    if (r === "admin") return <Badge>Admin</Badge>;
    if (r === "staff") return <Badge variant="secondary">Staff</Badge>;
    if (r === "client") return <Badge variant="outline">Client</Badge>;
    return <Badge variant="destructive">No role</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="User Management"
        actions={
          <Button onClick={startCreate}>
            <Plus className="h-4 w-4 mr-2" /> Add user
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground -mt-4">
        Create and manage staff and client accounts.
      </p>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No users yet.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.user_id}>
                  <TableCell className="font-medium">{r.name || "—"}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell>{roleBadge(r.role)}</TableCell>
                  <TableCell>
                    {r.disabled ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="secondary">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.role === "admin"
                      ? "All sections"
                      : PERM_KEYS.filter((p) => r.permissions[p.key])
                          .map((p) => p.label.split(" ")[0])
                          .join(", ") || "None"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => startEdit(r)}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={me?.id === r.user_id}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete user?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes {r.email} and revokes all access.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(r)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editRow ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editRow
                ? "Update profile, role, and permissions."
                : "Create a new account. Password must be at least 8 characters."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  disabled={!!editRow}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{editRow ? "New password (optional)" : "Password"}</Label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editRow ? "Leave blank to keep current" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={form.role}
                  onValueChange={(v) => setForm({ ...form, role: v as Role })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Permissions {form.role === "admin" && <span className="text-xs text-muted-foreground">(Admins always have full access)</span>}</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {PERM_KEYS.map((p) => (
                  <label key={p.key} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.role === "admin" ? true : form.permissions[p.key]}
                      disabled={form.role === "admin"}
                      onCheckedChange={(v) => togglePerm(p.key, !!v)}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>

            {editRow && (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.disabled}
                  onCheckedChange={(v) => setForm({ ...form, disabled: !!v })}
                />
                Disable this account
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>{editRow ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
