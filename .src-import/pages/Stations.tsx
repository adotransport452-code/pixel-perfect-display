import { useEffect, useState } from "react";
import { Plus, Search, FileDown } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api, Station } from "@/lib/store";
import { exportToExcel } from "@/lib/excel";

const empty = { name: "", code: "", phone: "", location: "", cbm_rate: 0, weight_rate: 0 };

const Stations = () => {
  const [items, setItems] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Station | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [viewing, setViewing] = useState<Station | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = () => api.stations.list().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const filtered = items.filter((s) =>
    [s.name, s.code, s.location, s.phone].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (s: Station) => { setEditing(s); setForm({ name: s.name, code: s.code, phone: s.phone || "", location: s.location || "", cbm_rate: s.cbm_rate, weight_rate: s.weight_rate }); setOpen(true); };

  const save = async () => {
    if (!form.name || !form.code) return toast.error("Name and Code are required");
    try {
      if (editing) { await api.stations.update(editing.id, { ...form, cbm_rate: Number(form.cbm_rate), weight_rate: Number(form.weight_rate) }); toast.success("Station updated"); }
      else { await api.stations.create({ ...form, cbm_rate: Number(form.cbm_rate), weight_rate: Number(form.weight_rate) }); toast.success("Station created"); }
      setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (s: Station) => {
    if (!confirm(`Delete station "${s.name}"?`)) return;
    try { await api.stations.remove(s.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const toggleRow = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? filtered.map((s) => s.id) : []);
  const stationRow = (s: Station) => ({ Name: s.name, Code: s.code, Phone: s.phone, Location: s.location, "CBM Rate": s.cbm_rate, "Weight Rate": s.weight_rate, Created: s.created_at });
  const exportSelected = () => {
    const rows = items.filter((s) => selectedIds.includes(s.id));
    if (!rows.length) return toast.error("Select at least one station");
    exportToExcel(rows.map(stationRow), `stations-selected-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportAll = () => {
    if (!items.length) return toast.error("Nothing to export");
    exportToExcel(items.map(stationRow), `stations-all-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div>
      <PageHeader
        title="Stations"
        breadcrumbs={[{ label: "Home" }, { label: "Stations" }]}
        actions={
          <>
            <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-9 w-64" /></div>
            <Button variant="outline" onClick={exportSelected} disabled={selectedIds.length === 0}><FileDown className="mr-1 h-4 w-4" />Export Selected ({selectedIds.length})</Button>
            <Button variant="outline" onClick={exportAll}><FileDown className="mr-1 h-4 w-4" />Export All</Button>
            <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Create</Button>
          </>
        }
      />
      <div className="p-6">
        <div className="mb-3 text-sm text-muted-foreground">Showing {filtered.length} of {items.length}</div>
        <DataTable<Station>
          data={filtered}
          maxHeight="calc(100vh - 240px)"
          selectable
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          columns={[
            { key: "#", header: "#", render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span> },
            { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
            { key: "code", header: "Code", render: (r) => <Badge variant="secondary" className="bg-primary/10 text-primary">{r.code}</Badge> },
            { key: "phone", header: "Phone", render: (r) => r.phone || "—" },
            { key: "location", header: "Location", className: "bg-amber-50 dark:bg-amber-950/30 font-semibold text-amber-900 dark:text-amber-200", headerClassName: "!bg-amber-500 !text-white", render: (r) => r.location || "—" },
            { key: "cbm_rate", header: "CBM Rate", className: "bg-amber-50 dark:bg-amber-950/30", headerClassName: "!bg-amber-500 !text-white", render: (r) => <span className="font-semibold text-amber-900 dark:text-amber-200">{r.cbm_rate}</span> },
            { key: "weight_rate", header: "Weight Rate", className: "bg-amber-50 dark:bg-amber-950/30", headerClassName: "!bg-amber-500 !text-white", render: (r) => <span className="font-semibold text-amber-900 dark:text-amber-200">{r.weight_rate}</span> },
            { key: "created_at", header: "Created At", headerClassName: "!bg-primary !text-primary-foreground", render: (r) => {
              const d = new Date(r.created_at);
              return <div className="text-sm"><div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div><div className="text-primary">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>;
            } },
            { key: "updated_at", header: "Last Modified", headerClassName: "!bg-primary !text-primary-foreground", render: (r) => {
              const d = new Date(r.updated_at);
              return <div className="text-sm"><div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div><div className="text-primary">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div></div>;
            } },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onView={() => setViewing(r)} onEdit={() => openEdit(r)} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing ? "Edit Station" : "Create Station"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Code *"><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="CBM Rate"><Input type="number" value={form.cbm_rate} onChange={(e) => setForm({ ...form, cbm_rate: e.target.value })} /></Field>
            <Field label="Weight Rate"><Input type="number" value={form.weight_rate} onChange={(e) => setForm({ ...form, weight_rate: e.target.value })} /></Field>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Station Details</DialogTitle></DialogHeader>
          {viewing && (
            <div className="grid grid-cols-2 gap-3 text-base">
              <Info label="Name" value={viewing.name} />
              <Info label="Code" value={viewing.code} />
              <Info label="Phone" value={viewing.phone || "—"} />
              <Info label="Location" value={viewing.location || "—"} />
              <Info label="CBM Rate" value={String(viewing.cbm_rate)} />
              <Info label="Weight Rate" value={String(viewing.weight_rate)} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm">{label}</Label>{children}</div>;
}
function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-sm text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>;
}

export default Stations;