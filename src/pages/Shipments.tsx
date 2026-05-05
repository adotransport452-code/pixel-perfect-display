import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, FileDown, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { api, Shipment, Station, Consignment } from "@/lib/store";
import { exportToExcel } from "@/lib/excel";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STATION_OPTIONS = [
  "Guangzhou", "Yiwu", "Lhasa", "Nylam (Khasa)", "Tatopani", "Kerung",
  "Kathmandu", "Nylam", "Shantou", "Tatopani - Kerung", "Kerung - Tatopani",
];
const CONTAINER_TYPES = ["Container", "Truck", "Train", "Plane", "Ship"];
const CLEAR = "__clear__";

const empty = {
  container_name: "", container_type: "Truck", lot_no: "",
  container_image_url: "" as string,
  driver_name: "", driver_phone: "", start_station: "", end_station: "",
  consignment_ids: [] as string[], remarks: "", status: "In Transit",
  dispatched_by: "",
};

const Shipments = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userTag = profile?.name || profile?.email || null;
  const [items, setItems] = useState<Shipment[]>([]);
  const [, setStations] = useState<Station[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [search, setSearch] = useState("");
  const [fStation, setFStation] = useState(CLEAR);
  const [fStatus, setFStatus] = useState(CLEAR);
  const [fDispatched, setFDispatched] = useState(CLEAR);
  const [fStartDate, setFStartDate] = useState("");
  const [fEndDate, setFEndDate] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [form, setForm] = useState<any>(empty);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [possibleSearch, setPossibleSearch] = useState("");
  const [selectedSearch, setSelectedSearch] = useState("");
  const [cartoonOverrides, setCartoonOverrides] = useState<Record<string, number>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    setUploadingImage(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("container-images").upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("container-images").getPublicUrl(path);
      setForm((f: any) => ({ ...f, container_image_url: data.publicUrl }));
      toast.success("Image uploaded");
    } catch (e: any) { toast.error(e.message || "Upload failed"); }
    finally { setUploadingImage(false); }
  };

  const load = () => Promise.all([api.shipments.list(), api.stations.list(), api.consignments.list()])
    .then(([sh, st, cn]) => { setItems(sh); setStations(st); setConsignments(cn); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const dispatchedOpts = useMemo(() => Array.from(new Set(items.map((i) => i.dispatched_by).filter(Boolean) as string[])), [items]);
  const stationOpts = useMemo(() => Array.from(new Set([...STATION_OPTIONS, ...items.flatMap((i) => [i.start_station, i.end_station])].filter(Boolean) as string[])), [items]);

  const filtered = items.filter((s) => {
    const hay = [s.lot_no, s.container_name, s.driver_name, s.start_station, s.end_station].filter(Boolean).join(" ").toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (fStation !== CLEAR && s.start_station !== fStation && s.end_station !== fStation) return false;
    if (fStatus !== CLEAR && s.status !== fStatus) return false;
    if (fDispatched !== CLEAR && s.dispatched_by !== fDispatched) return false;
    const created = (s.created_at || "").slice(0, 10);
    if (fStartDate && created < fStartDate) return false;
    if (fEndDate && created > fEndDate) return false;
    return true;
  });

  const toggleRow = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? filtered.map((s) => s.id) : []);
  const shipmentRow = (s: Shipment) => ({
    "Lot No": s.lot_no, "Container": s.container_name, "Type": s.container_type,
    "Driver": s.driver_name, "Phone": s.driver_phone, "From": s.start_station, "To": s.end_station,
    "Status": s.status, "Consignments": s.consignment_ids.length, "Dispatched By": s.dispatched_by,
    "Created By": s.created_by, "Created At": s.created_at, "Remarks": s.remarks,
  });
  const exportSelected = () => {
    const rows = items.filter((s) => selectedIds.includes(s.id));
    if (!rows.length) return toast.error("Select at least one shipment");
    exportToExcel(rows.map(shipmentRow), `shipments-selected-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportAll = () => {
    if (!items.length) return toast.error("Nothing to export");
    exportToExcel(items.map(shipmentRow), `shipments-all-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const possibleConsignments = useMemo(() => {
    const base = consignments.filter((c) =>
      (!form.start_station || c.start_station === form.start_station) &&
      (!form.end_station || c.end_station === form.end_station) &&
      !form.consignment_ids.includes(c.id)
    );
    const q = possibleSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((c) => [c.bill_no, c.marka, c.description, c.ctn_no].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [consignments, form.start_station, form.end_station, form.consignment_ids, possibleSearch]);

  const selected = useMemo(() => {
    const sel = consignments.filter((c) => form.consignment_ids.includes(c.id));
    const q = selectedSearch.trim().toLowerCase();
    if (!q) return sel;
    return sel.filter((c) => [c.bill_no, c.marka, c.description, c.ctn_no].filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [consignments, form.consignment_ids, selectedSearch]);

  const openCreate = () => { setEditing(null); setForm(empty); setCartoonOverrides({}); setOpen(true); };
  const openEdit = (s: Shipment) => {
    setEditing(s);
    setForm({ ...s, container_image_url: s.container_image_url || "", consignment_ids: s.consignment_ids || [] });
    setCartoonOverrides({}); setOpen(true);
  };

  const addConsignment = (id: string) =>
    setForm((f: any) => ({ ...f, consignment_ids: f.consignment_ids.includes(id) ? f.consignment_ids : [...f.consignment_ids, id] }));
  const removeConsignment = (id: string) =>
    setForm((f: any) => ({ ...f, consignment_ids: f.consignment_ids.filter((x: string) => x !== id) }));

  const save = async () => {
    try {
      const payload: any = {
        ...form,
        consignment_ids: form.consignment_ids,
      };
      if (editing) await api.shipments.update(editing.id, payload);
      else await api.shipments.create({ ...payload, created_by: userTag });
      toast.success("Saved"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (s: Shipment) => {
    if (!confirm(`Delete shipment "${s.lot_no}"?`)) return;
    try { await api.shipments.remove(s.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const statusBadge = (st: string) => {
    const cls = st === "Delivered" ? "bg-success text-success-foreground" : st === "In Transit" ? "bg-warning text-warning-foreground" : "bg-muted";
    return <Badge className={cls}>{st}</Badge>;
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" });
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div>
      <PageHeader
        title="Dispatched Shipments"
        breadcrumbs={[{ label: "Home" }, { label: "Shipments" }, { label: "Dispatched Shipments" }]}
        actions={
          <>
            <Button variant="outline" onClick={exportSelected} disabled={selectedIds.length === 0}><FileDown className="mr-1 h-4 w-4" />Export Selected ({selectedIds.length})</Button>
            <Button variant="outline" onClick={exportAll}><FileDown className="mr-1 h-4 w-4" />Export All</Button>
            <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Create Shipment</Button>
          </>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-6">
          <SF label="Search">
            <div className="relative"><Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="eg. Search…" className="pl-7 h-9" /></div>
          </SF>
          <SF label="Station">
            <Select value={fStation} onValueChange={setFStation}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent><SelectItem value={CLEAR}>All</SelectItem>{stationOpts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </SF>
          <SF label="Status">
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent><SelectItem value={CLEAR}>All</SelectItem><SelectItem value="In Transit">In Transit</SelectItem><SelectItem value="Delivered">Delivered</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
            </Select>
          </SF>
          <SF label="Dispatched By">
            <Select value={fDispatched} onValueChange={setFDispatched}>
              <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
              <SelectContent><SelectItem value={CLEAR}>All</SelectItem>{dispatchedOpts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
            </Select>
          </SF>
          <SF label="Start Date"><Input type="date" value={fStartDate} onChange={(e) => setFStartDate(e.target.value)} className="h-9" /></SF>
          <SF label="End Date"><Input type="date" value={fEndDate} onChange={(e) => setFEndDate(e.target.value)} className="h-9" /></SF>
        </div>
        <div className="mb-3 text-sm text-muted-foreground">Showing Results: 1-{filtered.length} of {items.length}</div>
        <DataTable<Shipment>
          data={filtered}
          maxHeight="calc(100vh - 320px)"
          selectable
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          columns={[
            { key: "#", header: "#", render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span> },
            { key: "lot_no", header: "Lot No", render: (r) => <Badge variant="secondary" className="bg-primary/10 text-primary">{r.lot_no}</Badge> },
            { key: "container", header: "Container", render: (r) => <div><div className="text-sm"><b>Name:</b> {r.container_name}</div><div className="text-sm"><b>Type:</b> <span className="text-primary">{r.container_type}</span></div></div> },
            { key: "driver", header: "Driver Details", render: (r) => <div><div className="text-sm"><b>Name:</b> {r.driver_name || "—"}</div><div className="text-sm"><b>Phone:</b> {r.driver_phone || "—"}</div></div> },
            { key: "no_consig", header: "Consignments", render: (r) => <Badge variant="outline">{r.consignment_ids.length}</Badge> },
            { key: "from", header: "From", render: (r) => <Badge variant="outline">{r.start_station}</Badge> },
            { key: "status", header: "Status", render: (r) => statusBadge(r.status) },
            { key: "to", header: "Destination", render: (r) => <Badge variant="outline">{r.end_station}</Badge> },
            { key: "by", header: "Dispatched By", render: (r) => r.dispatched_by || "—" },
            { key: "created_by", header: "Created By", render: (r) => <span className="text-sm">{r.created_by || "—"}</span> },
            { key: "created_at", header: "Created At", render: (r) => (
              <div className="text-sm"><div className="font-semibold">{fmtDate(r.created_at)}</div><div className="text-primary">{fmtTime(r.created_at)}</div></div>
            ) },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onView={() => navigate(`/shipments/${r.id}`)} onEdit={() => openEdit(r)} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-[98vw] w-[98vw] max-h-[95vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Shipment" : "Dispatch Shipment"}</DialogTitle></DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-base font-semibold text-primary">Container Details</div>
              <div className="space-y-3">
                <F label="Container Name *"><Input value={form.container_name} onChange={(e) => setForm({ ...form, container_name: e.target.value })} placeholder="eg. TLC23" /></F>
                <F label="Container Type *">
                  <Select value={form.container_type || CLEAR} onValueChange={(v) => setForm({ ...form, container_type: v === CLEAR ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Select container type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR}>Clear Selection</SelectItem>
                      {CONTAINER_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </F>
                <F label="Container Image">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                  />
                  {form.container_image_url ? (
                    <div className="relative rounded-lg border border-border overflow-hidden">
                      <img src={form.container_image_url} alt="Container" className="w-full h-40 object-cover" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => setForm({ ...form, container_image_url: "" })}
                      ><X className="h-4 w-4" /></Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const f = e.dataTransfer.files?.[0];
                        if (f) handleImageUpload(f);
                      }}
                      className="flex h-40 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-muted/30 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
                    >
                      <Upload className="mb-2 h-6 w-6 text-primary" />
                      <div>{uploadingImage ? "Uploading…" : "Drag your file(s) to start uploading"}</div>
                      <div className="my-2 text-xs">— OR —</div>
                      <span className="rounded border border-primary/50 px-3 py-1 text-xs text-primary">Browse Files</span>
                    </button>
                  )}
                </F>
              </div>
            </div>
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Lot Details</div>
                <F label="Lot No. *"><Input value={form.lot_no} onChange={(e) => setForm({ ...form, lot_no: e.target.value })} placeholder="eg. Lot23" /></F>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Driver Details</div>
                <div className="grid grid-cols-2 gap-3">
                  <F label="Driver Name"><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} placeholder="Driver name here…" /></F>
                  <F label="Driver Phone *"><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} placeholder="eg. 9845508943" /></F>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 text-base font-semibold text-primary">Start Station</div>
                  <Select value={form.start_station || CLEAR} onValueChange={(v) => setForm({ ...form, start_station: v === CLEAR ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Choose station" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR}>Clear Selection</SelectItem>
                      {STATION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="mb-3 text-base font-semibold text-primary">End Station</div>
                  <Select value={form.end_station || CLEAR} onValueChange={(v) => setForm({ ...form, end_station: v === CLEAR ? "" : v })}>
                    <SelectTrigger><SelectValue placeholder="Choose station" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={CLEAR}>Clear Selection</SelectItem>
                      {STATION_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Possible Shipment Consignments */}
          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-semibold text-primary">Possible Shipment Consignments ({possibleConsignments.length})</div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={possibleSearch} onChange={(e) => setPossibleSearch(e.target.value)} placeholder="Search here…" className="pl-7 h-9" />
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-border max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-gradient-primary text-primary-foreground sticky top-0 z-10">
                  <tr>
                    <th className="p-2 w-8"></th>
                    {["Date","Consignment No.","Marka","CTNS","Cartoon","CBM","GW","Freight","Local Freight","Bill Charge","Insurance","Other Charge","Amount","End Station"].map((h) => (
                      <th key={h} className="p-2 text-left whitespace-nowrap font-bold text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {possibleConsignments.length === 0 ? (
                    <tr><td colSpan={15} className="p-4 text-center text-muted-foreground">No Data Found</td></tr>
                  ) : possibleConsignments.map((c) => {
                    const other = Number(c.packaging_fee || 0) + Number(c.loading_fee || 0) + Number(c.unloading_fee || 0);
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                        <td className="p-2"><Checkbox checked={false} onCheckedChange={() => addConsignment(c.id)} /></td>
                        <td className="p-2 whitespace-nowrap">{new Date(c.start_date).toLocaleDateString()}</td>
                        <td className="p-2">{c.bill_no}</td>
                        <td className="p-2">{c.marka}</td>
                        <td className="p-2">{c.ctn_no || "—"}</td>
                        <td className="p-2 text-center">{c.cartoon}</td>
                        <td className="p-2 text-center">{c.cbm}</td>
                        <td className="p-2 text-center">{c.weight}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.freight || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.local_freight || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.bill_charge || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.insurance || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(other)}</td>
                        <td className="p-2 text-right font-semibold">¥ {Math.round(Number(c.grand_total || 0))}</td>
                        <td className="p-2"><Badge variant="outline">{c.end_station}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Shipment Consignments */}
          <div className="mt-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="text-base font-semibold text-primary">Selected Shipment Consignments ({form.consignment_ids.length})</div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={selectedSearch} onChange={(e) => setSelectedSearch(e.target.value)} placeholder="Search here…" className="pl-7 h-9" />
              </div>
            </div>
            <div className="overflow-auto rounded-lg border border-border max-h-72">
              <table className="w-full text-sm">
                <thead className="bg-gradient-primary text-primary-foreground sticky top-0 z-10">
                  <tr>
                    {["S.N","Consignment Details","CTNS","CBM","GW","Freight","Local Freight","Bill Charge","Insurance","Other Charge","Amount","Available Cartoon","No. of Cartoon","Action"].map((h) => (
                      <th key={h} className="p-2 text-left whitespace-nowrap font-bold text-xs uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selected.length === 0 ? (
                    <tr><td colSpan={14} className="p-4 text-center text-muted-foreground">No Data Found</td></tr>
                  ) : selected.map((c, i) => {
                    const other = Number(c.packaging_fee || 0) + Number(c.loading_fee || 0) + Number(c.unloading_fee || 0);
                    const noCartoon = cartoonOverrides[c.id] ?? c.cartoon;
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-accent/30">
                        <td className="p-2">{i + 1}</td>
                        <td className="p-2">
                          <div className="text-sm font-semibold">{c.bill_no}</div>
                          <div className="text-xs text-muted-foreground">{c.marka}</div>
                        </td>
                        <td className="p-2">{c.ctn_no || "—"}</td>
                        <td className="p-2 text-center">{c.cbm}</td>
                        <td className="p-2 text-center">{c.weight}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.freight || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.local_freight || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.bill_charge || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(Number(c.insurance || 0))}</td>
                        <td className="p-2 text-right">¥ {Math.round(other)}</td>
                        <td className="p-2 text-right font-semibold">¥ {Math.round(Number(c.grand_total || 0))}</td>
                        <td className="p-2 text-center">{c.cartoon}</td>
                        <td className="p-2">
                          <Input
                            type="number"
                            value={noCartoon}
                            min={0}
                            max={c.cartoon}
                            onChange={(e) => setCartoonOverrides((m) => ({ ...m, [c.id]: Number(e.target.value) }))}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="p-2">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeConsignment(c.id)} title="Remove">
                            <X className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <F label="Status">
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="In Transit">In Transit</SelectItem><SelectItem value="Delivered">Delivered</SelectItem><SelectItem value="Pending">Pending</SelectItem></SelectContent>
              </Select>
            </F>
            <F label="Dispatched By"><Input value={form.dispatched_by} onChange={(e) => setForm({ ...form, dispatched_by: e.target.value })} /></F>
          </div>
          <div className="mt-3"><F label="Remarks"><Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="Shipment remarks here…" /></F></div>

          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1.5 block text-sm">{label}</Label>{children}</div>;
}
function SF({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs text-primary font-medium">{label}</Label>{children}</div>;
}

export default Shipments;
