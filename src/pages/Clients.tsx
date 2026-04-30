import { useEffect, useMemo, useState } from "react";
import { Plus, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { api, Client } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import { exportToExcel } from "@/lib/excel";

const empty = { name: "", phone: "", address: "" };

const Clients = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Client[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState<any>(empty);

  const [rows, setRows] = useState("20");
  const [search, setSearch] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const load = () => api.clients.list().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const me = user?.email || "User";

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (c: Client) => { setEditing(c); setForm({ name: c.name, phone: c.phone || "", address: c.address || "" }); setOpen(true); };

  const save = async () => {
    if (!form.name) return toast.error("Name is required");
    try {
      if (editing) {
        await api.clients.update(editing.id, { ...form, updated_by: me });
        toast.success("Client updated");
      } else {
        await api.clients.create({ ...form, created_by: me, updated_by: me });
        toast.success("Client created");
      }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (c: Client) => {
    if (!confirm(`Delete client "${c.name}"?`)) return;
    try { await api.clients.remove(c.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const filtered = useMemo(() => {
    return items.filter((c) => {
      const hay = [c.name, c.phone, c.address, c.created_by, c.updated_by].filter(Boolean).join(" ").toLowerCase();
      if (search && !hay.includes(search.toLowerCase())) return false;
      const created = (c.created_at || "").slice(0, 10);
      if (fStart && created < fStart) return false;
      if (fEnd && created > fEnd) return false;
      return true;
    }).slice(0, Number(rows) || 20);
  }, [items, search, fStart, fEnd, rows]);

  const clientRow = (c: Client) => ({
    Name: c.name, Phone: c.phone, Address: c.address,
    "Created By": c.created_by, "Updated By": c.updated_by,
    "Created At": c.created_at, "Last Modified": c.updated_at,
  });
  const exportSelected = () => exportAll();
  const exportAll = () => {
    if (!items.length) return toast.error("Nothing to export");
    exportToExcel(items.map(clientRow), `clients-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div>
      <PageHeader
        title="Clients"
        breadcrumbs={[{ label: "Home" }, { label: "Clients" }]}
      />
      <div className="p-6">
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground mr-auto">Showing Results: 1-{filtered.length}</div>
          <SF label="Rows">
            <Input value={rows} onChange={(e) => setRows(e.target.value)} className="h-9 w-20" />
          </SF>
          <SF label="Search">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="eg. Search.." className="pl-7 h-9 w-56" />
            </div>
          </SF>
          <SF label="Start Date"><Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className="h-9" /></SF>
          <SF label="End Date"><Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="h-9" /></SF>
          <Button variant="outline" onClick={exportSelected}><FileDown className="mr-1 h-4 w-4" />Export</Button>
          <Button variant="outline" onClick={exportAll}><FileDown className="mr-1 h-4 w-4" />Export All</Button>
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Create</Button>
        </div>

        <DataTable<Client>
          data={filtered}
          maxHeight="calc(100vh - 320px)"
          columns={[
            { key: "#", header: "#", render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span> },
            { key: "name", header: "Full Name", render: (r) => <span className="font-semibold">{r.name}</span> },
            { key: "phone", header: "Phone No.", render: (r) => r.phone || "—" },
            { key: "address", header: "Address", render: (r) => r.address || "N/A" },
            { key: "created_by", header: "Created By", render: (r) => r.created_by || "—" },
            { key: "updated_by", header: "Last Updated By", render: (r) => r.updated_by || r.created_by || "—" },
            { key: "created_at", header: "Created At", render: (r) => {
              const d = new Date(r.created_at);
              return <div className="text-sm"><div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div><div className="text-muted-foreground">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>;
            } },
            { key: "updated_at", header: "Last Modified", render: (r) => {
              const d = new Date(r.updated_at);
              return <div className="text-sm"><div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div><div className="text-muted-foreground">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>;
            } },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onEdit={() => openEdit(r)} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Client" : "Create Client"}</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <Field label="Full Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="eg. Abhishek" /></Field>
            <Field label="Phone No."><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="eg. 9849723195" /></Field>
            <Field label="Address"><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address…" rows={3} /></Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm">{label}</Label>{children}</div>;
}
function SF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="mb-1 text-xs text-muted-foreground">{label}</div>{children}</div>;
}

export default Clients;
