import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X, Trash2, Download, Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api, Consignment, DeliveryReceipt } from "@/lib/store";
import { useAuth } from "@/contexts/AuthContext";
import adoLogo from "@/assets/ado-logo.png";

type FormState = {
  consignment_ids: string[];
  client_name: string; client_phone: string; client_email: string;
  receiver_name: string; receiver_phone: string; receiver_email: string;
  remarks: string;
};
const emptyForm: FormState = {
  consignment_ids: [],
  client_name: "", client_phone: "", client_email: "",
  receiver_name: "", receiver_phone: "", receiver_email: "",
  remarks: "",
};

const DeliveryReceipts = () => {
  const { profile } = useAuth();
  const userTag = profile?.name || profile?.email || null;
  const [items, setItems] = useState<DeliveryReceipt[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryReceipt | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pickQuery, setPickQuery] = useState("");
  const [viewing, setViewing] = useState<DeliveryReceipt | null>(null);

  const [search, setSearch] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  const load = () => Promise.all([api.deliveryReceipts.list(), api.consignments.list()])
    .then(([d, c]) => { setItems(d); setConsignments(c); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const consMap = useMemo(() => {
    const m = new Map<string, Consignment>();
    consignments.forEach((c) => m.set(c.id, c));
    return m;
  }, [consignments]);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setPickQuery(""); setOpen(true); };
  const openEdit = (d: DeliveryReceipt) => {
    setEditing(d);
    setForm({
      consignment_ids: d.consignment_ids || [],
      client_name: d.client_name || "", client_phone: d.client_phone || "", client_email: d.client_email || "",
      receiver_name: d.receiver_name || "", receiver_phone: d.receiver_phone || "", receiver_email: d.receiver_email || "",
      remarks: d.remarks || "",
    });
    setPickQuery(""); setOpen(true);
  };

  const addConsignment = (id: string) => {
    if (!id) return;
    if (form.consignment_ids.includes(id)) return toast.error("Already added");
    if (!consMap.has(id)) return toast.error("Consignment not found");
    setForm((f) => ({ ...f, consignment_ids: [...f.consignment_ids, id] }));
    setPickQuery("");
  };
  const addByQuery = () => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return;
    const found = consignments.find((c) => c.id === pickQuery || (c.bill_no || "").toLowerCase() === q);
    if (!found) return toast.error("No matching consignment");
    addConsignment(found.id);
  };
  const removeFromForm = (id: string) =>
    setForm((f) => ({ ...f, consignment_ids: f.consignment_ids.filter((x) => x !== id) }));

  const save = async () => {
    if (!form.client_name || !form.client_phone) return toast.error("Client name and phone are required");
    if (!form.receiver_name || !form.receiver_phone) return toast.error("Receiver name and phone are required");
    if (form.consignment_ids.length === 0) return toast.error("Add at least one consignment");
    try {
      const payload: Partial<DeliveryReceipt> = {
        consignment_ids: form.consignment_ids,
        client_name: form.client_name, client_phone: form.client_phone, client_email: form.client_email || null,
        receiver_name: form.receiver_name, receiver_phone: form.receiver_phone, receiver_email: form.receiver_email || null,
        remarks: form.remarks || null,
      };
      if (editing) await api.deliveryReceipts.update(editing.id, payload);
      else await api.deliveryReceipts.create({ ...payload, created_by: userTag });
      toast.success("Saved"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (d: DeliveryReceipt) => {
    if (!confirm(`Delete delivery receipt for "${d.client_name}"?`)) return;
    try { await api.deliveryReceipts.remove(d.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const filtered = items.filter((d) => {
    const linkedConsignments = (d.consignment_ids || []).map((id) => consMap.get(id)).filter(Boolean) as Consignment[];
    const consignmentTokens = linkedConsignments.flatMap((c) => [c.bill_no, c.id, c.marka]).filter(Boolean);
    const hay = [d.client_name, d.client_phone, d.client_email, d.receiver_name, d.receiver_phone, d.receiver_email, d.remarks, d.created_by, d.id, ...consignmentTokens, ...(d.consignment_ids || [])]
      .filter(Boolean).join(" ").toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    const created = (d.created_at || "").slice(0, 10);
    if (fStart && created < fStart) return false;
    if (fEnd && created > fEnd) return false;
    return true;
  });

  // datalist suggestions for the picker (exclude already added)
  const pickerOptions = consignments.filter((c) => !form.consignment_ids.includes(c.id));

  return (
    <div>
      <PageHeader
        title="Delivery Receipts"
        breadcrumbs={[{ label: "Home" }, { label: "Delivery Receipts" }]}
        actions={
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" />Create Delivery Receipt
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-4">
          <SF label="Search">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client, consignment no, TrackID…" className="pl-7 h-9" />
            </div>
          </SF>
          <SF label="Start Date"><Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className="h-9" /></SF>
          <SF label="End Date"><Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="h-9" /></SF>
        </div>
        <div className="mb-3 text-sm text-muted-foreground">Showing Results: 1-{filtered.length} of {items.length}</div>
        <DataTable<DeliveryReceipt>
          data={filtered}
          maxHeight="calc(100vh - 320px)"
          columns={[
            { key: "#", header: "#", render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span> },
            { key: "client", header: "Client Details", render: (r) => (
              <div className="text-sm leading-tight">
                <div><b>Name:</b> {r.client_name}</div>
                <div><b>Phone:</b> {r.client_phone}</div>
                {r.client_email && <div><b>Email:</b> {r.client_email}</div>}
              </div>
            ) },
            { key: "receiver", header: "Receiver Details", render: (r) => (
              <div className="text-sm leading-tight">
                <div><b>Name:</b> {r.receiver_name}</div>
                <div><b>Phone:</b> {r.receiver_phone}</div>
                {r.receiver_email && <div><b>Email:</b> {r.receiver_email}</div>}
              </div>
            ) },
            { key: "no_consig", header: "No. of Consignment", render: (r) => (
              <Badge variant="secondary" className="bg-primary/10 text-primary">{(r.consignment_ids || []).length}</Badge>
            ) },
            { key: "remarks", header: "Remarks", render: (r) => <span className="text-sm">{r.remarks || "—"}</span> },
            { key: "created_by", header: "Created By", render: (r) => r.created_by || "—" },
            { key: "created_at", header: "Created At", render: (r) => (
              <div className="text-sm">
                <div className="font-semibold">{new Date(r.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div>
                <div className="text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</div>
              </div>
            ) },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onView={() => setViewing(r)} onEdit={() => openEdit(r)} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">{editing ? "Edit Delivery Receipt" : "Create Receipt"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT — consignment picker */}
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-base font-semibold text-primary">Create Receipt</div>
              <label className="text-sm font-medium">Consignment No <span className="text-destructive">*</span></label>
              <div className="mt-1 flex gap-2">
                <Input
                  list="dr-consignments"
                  value={pickQuery}
                  onChange={(e) => setPickQuery(e.target.value)}
                  placeholder="Select or type a Consignment No"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addByQuery(); } }}
                />
                <datalist id="dr-consignments">
                  {pickerOptions.map((c) => <option key={c.id} value={c.bill_no}>{c.marka} — {c.start_station} → {c.end_station}</option>)}
                </datalist>
                <Button onClick={addByQuery} className="bg-gradient-primary text-primary-foreground shrink-0">Add</Button>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-gradient-primary text-primary-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">#</th>
                      <th className="px-3 py-2 text-left font-bold">Consignment No</th>
                      <th className="px-3 py-2 text-left font-bold">Brand</th>
                      <th className="px-3 py-2 text-left font-bold">Cartoon</th>
                      <th className="px-3 py-2 text-left font-bold">Start Station</th>
                      <th className="px-3 py-2 text-left font-bold">End Station</th>
                      <th className="px-3 py-2 text-center font-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.consignment_ids.length === 0 ? (
                      <tr><td colSpan={7} className="p-6 text-center italic text-muted-foreground">No Data Found</td></tr>
                    ) : form.consignment_ids.map((id, idx) => {
                      const c = consMap.get(id);
                      if (!c) return (
                        <tr key={id} className="border-t border-border">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2 italic text-muted-foreground" colSpan={5}>Unknown ({id.slice(0,8)}…)</td>
                          <td className="p-2 text-center"><button onClick={() => removeFromForm(id)} className="text-destructive"><Trash2 className="inline h-4 w-4" /></button></td>
                        </tr>
                      );
                      return (
                        <tr key={id} className="border-t border-border">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{c.bill_no}</td>
                          <td className="p-2 bg-amber-50 text-amber-900 font-medium">{c.marka}</td>
                          <td className="p-2 bg-emerald-50 text-emerald-900 font-medium">{c.cartoon ?? 0}</td>
                          <td className="p-2">{c.start_station}</td>
                          <td className="p-2">{c.end_station}</td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeFromForm(id)} title="Remove" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT — client / receiver / optional */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Client Details:</div>
                <div className="space-y-3">
                  <F label="Name *"><Input value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} placeholder="eg. John Doe" /></F>
                  <F label="Phone No. *"><Input value={form.client_phone} onChange={(e) => setForm({ ...form, client_phone: e.target.value })} placeholder="eg. 99XXXXXXXXX" /></F>
                  <F label="Email"><Input type="email" value={form.client_email} onChange={(e) => setForm({ ...form, client_email: e.target.value })} placeholder="eg. johndoe@gmail.com" /></F>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Receiver Details:</div>
                <div className="space-y-3">
                  <F label="Name *"><Input value={form.receiver_name} onChange={(e) => setForm({ ...form, receiver_name: e.target.value })} placeholder="eg. John Doe" /></F>
                  <F label="Phone No. *"><Input value={form.receiver_phone} onChange={(e) => setForm({ ...form, receiver_phone: e.target.value })} placeholder="eg. 99XXXXXXXXX" /></F>
                  <F label="Email"><Input type="email" value={form.receiver_email} onChange={(e) => setForm({ ...form, receiver_email: e.target.value })} placeholder="eg. johndoe@gmail.com" /></F>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Optional Details:</div>
                <F label="Remarks">
                  <Textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} placeholder="eg. Remarks here …" rows={3} />
                </F>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} className="bg-gradient-primary text-primary-foreground">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View dialog — printable receipt */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="sr-only"><DialogTitle>Delivery Receipt</DialogTitle></DialogHeader>
          {viewing && <ReceiptView d={viewing} consMap={consMap} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function ReceiptView({ d, consMap }: { d: DeliveryReceipt; consMap: Map<string, Consignment> }) {
  const rows = (d.consignment_ids || []).map((id) => consMap.get(id)).filter(Boolean) as Consignment[];
  const total = rows.reduce((s, c) => s + Math.round(Number(c.grand_total || 0)), 0);
  return (
    <div className="bg-[#eaf4fa] p-8 text-black">
      <div className="flex flex-col items-center text-center">
        <img src={adoLogo} alt="ADO" className="h-16 w-auto object-contain" />
        <div className="mt-2 text-base font-semibold tracking-wide">THANK YOU FOR YOUR ORDER</div>
        <div className="text-xs text-amber-700">Please find attachment below your order information</div>
      </div>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="grid grid-cols-2 gap-8 px-2">
        <div>
          <div className="text-base font-bold text-[#0f4a8a]">Client Details:</div>
          <div className="mt-2 space-y-1 text-sm">
            <div><b>Name :</b> {d.client_name}</div>
            <div><b>Contact No. :</b> {d.client_phone}</div>
            {d.client_email && <div><b>Email :</b> {d.client_email}</div>}
          </div>
        </div>
        <div>
          <div className="text-base font-bold text-[#0f4a8a]">Receiver Details:</div>
          <div className="mt-2 space-y-1 text-sm">
            <div><b>Name :</b> {d.receiver_name}</div>
            <div><b>Contact No. :</b> {d.receiver_phone}</div>
            {d.receiver_email && <div><b>Email :</b> {d.receiver_email}</div>}
          </div>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-slate-400" />

      <div className="px-2 text-base font-semibold text-black">Delivered Consignments</div>
      <div className="mt-2 px-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-white text-center">
              <th className="border border-slate-300 px-3 py-2 font-semibold">S.N</th>
              <th className="border border-slate-300 px-3 py-2 font-semibold">Consignment No.</th>
              <th className="border border-slate-300 px-3 py-2 font-semibold">Brand</th>
              <th className="border border-slate-300 px-3 py-2 font-semibold">Quantity</th>
              <th className="border border-slate-300 px-3 py-2 font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="border border-slate-300 px-3 py-4 text-center italic text-muted-foreground">No consignments</td></tr>
            ) : rows.map((c, i) => (
              <tr key={c.id} className="text-center">
                <td className="border border-slate-300 px-3 py-2">{i + 1}</td>
                <td className="border border-slate-300 px-3 py-2">{c.bill_no}</td>
                <td className="border border-slate-300 px-3 py-2">{c.marka}</td>
                <td className="border border-slate-300 px-3 py-2">{Number(c.quantity || 0)}</td>
                <td className="border border-slate-300 px-3 py-2">¥ {Math.round(Number(c.grand_total || 0))}</td>
              </tr>
            ))}
            <tr className="text-center font-semibold">
              <td className="border border-slate-300 px-3 py-2" colSpan={4} style={{ textAlign: "right" }}>Total</td>
              <td className="border border-slate-300 px-3 py-2">¥ {total}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {d.remarks && (
        <div className="mt-4 px-2 text-sm"><b>Remarks:</b> {d.remarks}</div>
      )}
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function SF({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-primary">{label}</label>
      {children}
    </div>
  );
}

export default DeliveryReceipts;