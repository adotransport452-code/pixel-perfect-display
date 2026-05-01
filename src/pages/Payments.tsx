import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2, Upload, Calendar, User, FileText, CheckCircle2, Receipt as ReceiptIcon, Wallet, BadgeCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { api, Consignment, Payment, PaymentConsignmentDetail } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

type FormState = {
  rows: PaymentConsignmentDetail[];
  amount: string;
  verifier: string;
  remarks: string;
  receipt_url: string | null;
};

const emptyForm: FormState = { rows: [], amount: "", verifier: "", remarks: "", receipt_url: null };

const Payments = () => {
  const [items, setItems] = useState<Payment[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [pickQuery, setPickQuery] = useState("");
  const [viewing, setViewing] = useState<Payment | null>(null);
  const [uploading, setUploading] = useState(false);

  const [search, setSearch] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fStatus, setFStatus] = useState("");

  const load = () => Promise.all([api.payments.list(), api.consignments.list()])
    .then(([p, c]) => { setItems(p); setConsignments(c); })
    .catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const consMap = useMemo(() => {
    const m = new Map<string, Consignment>();
    consignments.forEach((c) => m.set(c.id, c));
    return m;
  }, [consignments]);

  const openCreate = () => { setForm(emptyForm); setPickQuery(""); setOpen(true); };

  const subTotal = form.rows.reduce((s, r) => s + Number(r.bill_amount || 0), 0);
  const totalDiscount = form.rows.reduce((s, r) => s + Number(r.discount || 0), 0);
  const totalPayment = form.rows.reduce((s, r) => s + Number(r.payment || 0), 0);
  const remaining = Math.max(0, subTotal - totalDiscount - totalPayment);

  const addByQuery = () => {
    const q = pickQuery.trim().toLowerCase();
    if (!q) return;
    const found = consignments.find((c) => c.id === pickQuery || (c.bill_no || "").toLowerCase() === q);
    if (!found) return toast.error("No matching consignment");
    if (form.rows.some((r) => r.consignment_id === found.id)) return toast.error("Already added");
    const billAmt = Number(found.grand_total || 0);
    setForm((f) => ({
      ...f,
      rows: [...f.rows, { consignment_id: found.id, bill_no: found.bill_no, bill_amount: billAmt, discount: 0, payment: billAmt }],
    }));
    setPickQuery("");
  };

  const removeRow = (id: string) =>
    setForm((f) => ({ ...f, rows: f.rows.filter((r) => r.consignment_id !== id) }));

  const updateRow = (id: string, patch: Partial<PaymentConsignmentDetail>) =>
    setForm((f) => ({ ...f, rows: f.rows.map((r) => r.consignment_id === id ? { ...r, ...patch } : r) }));

  const calculate = () => {
    const target = Number(form.amount || 0);
    if (!target || form.rows.length === 0) return toast.error("Enter amount and add consignments");
    let remainingTarget = target;
    setForm((f) => ({
      ...f,
      rows: f.rows.map((r) => {
        const due = Math.max(0, Number(r.bill_amount) - Number(r.discount));
        const pay = Math.min(due, remainingTarget);
        remainingTarget -= pay;
        return { ...r, payment: pay };
      }),
    }));
    toast.success("Distributed payment across consignments");
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("payment-receipts").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("payment-receipts").getPublicUrl(path);
      setForm((f) => ({ ...f, receipt_url: data.publicUrl }));
      toast.success("Receipt uploaded");
    } catch (e: any) { toast.error(e.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (form.rows.length === 0) return toast.error("Add at least one consignment");
    if (totalPayment <= 0) return toast.error("Payment amount must be greater than 0");
    try {
      await api.payments.create({
        consignment_ids: form.rows.map((r) => r.consignment_id),
        consignment_details: form.rows,
        amount: totalPayment,
        discount: totalDiscount,
        paid_amount: totalPayment,
        sub_total: subTotal,
        remaining_amount: remaining,
        receipt_url: form.receipt_url,
        status: "Approved",
        verifier: form.verifier || null,
        initiated_by: "User",
        remarks: form.remarks || null,
      });
      toast.success("Payment initiated"); setOpen(false); load();
    } catch (e: any) { toast.error(e.message); }
  };

  const remove = async (p: Payment) => {
    if (!confirm("Delete this payment?")) return;
    try { await api.payments.remove(p.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const filtered = items.filter((p) => {
    const billNos = (p.consignment_ids || []).map((cid) => consMap.get(cid)?.bill_no).filter(Boolean) as string[];
    const detailBills = (p.consignment_details || []).map((d) => d.bill_no).filter(Boolean);
    const hay = [p.id, p.verifier, p.initiated_by, p.remarks, ...(p.consignment_ids || []), ...billNos, ...detailBills]
      .filter(Boolean).join(" ").toLowerCase();
    if (search && !hay.includes(search.toLowerCase())) return false;
    if (fStatus && p.status !== fStatus) return false;
    const created = (p.created_at || "").slice(0, 10);
    if (fStart && created < fStart) return false;
    if (fEnd && created > fEnd) return false;
    return true;
  });

  const pickerOptions = consignments.filter((c) => !form.rows.some((r) => r.consignment_id === c.id));

  return (
    <div>
      <PageHeader
        title="Initiations"
        breadcrumbs={[{ label: "Home" }, { label: "Payments" }, { label: "Initiations" }]}
        actions={
          <Button onClick={openCreate} className="bg-gradient-primary text-primary-foreground">
            <Plus className="mr-1 h-4 w-4" />Initiate Payment
          </Button>
        }
      />
      <div className="p-6">
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-3 lg:grid-cols-5">
          <SF label="Search">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Consignment No, Track ID…" className="pl-7 h-9" />
            </div>
          </SF>
          <SF label="Status">
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
              <option value="Rejected">Rejected</option>
            </select>
          </SF>
          <SF label="Start Date"><Input type="date" value={fStart} onChange={(e) => setFStart(e.target.value)} className="h-9" /></SF>
          <SF label="End Date"><Input type="date" value={fEnd} onChange={(e) => setFEnd(e.target.value)} className="h-9" /></SF>
        </div>
        <div className="mb-3 text-sm text-muted-foreground">Showing Results: 1-{filtered.length} of {items.length}</div>
        <DataTable<Payment>
          data={filtered}
          maxHeight="calc(100vh - 320px)"
          columns={[
            { key: "#", header: "#", render: (_r, i) => <span className="text-muted-foreground">{i + 1}</span> },
            { key: "amount", header: "Amount", render: (r) => <span className="font-medium">¥ {Number(r.amount).toLocaleString()}</span> },
            { key: "discount", header: "Discount", render: (r) => <span>¥ {Number(r.discount).toLocaleString()}</span> },
            { key: "receipt", header: "Receipt", render: (r) => r.receipt_url ? <img src={r.receipt_url} alt="receipt" className="h-10 w-14 rounded border object-cover" /> : <span className="text-xs text-muted-foreground">—</span> },
            { key: "status", header: "Status", render: (r) => (
              <Badge className={r.status === "Approved" ? "bg-emerald-500 text-white hover:bg-emerald-500" : r.status === "Rejected" ? "bg-destructive text-destructive-foreground" : "bg-amber-500 text-white"}>{r.status}</Badge>
            ) },
            { key: "no_consig", header: "No. of Consignments", render: (r) => (
              <Badge variant="secondary" className="bg-primary/10 text-primary">{(r.consignment_ids || []).length}</Badge>
            ) },
            { key: "initiated_by", header: "Initiated By", render: (r) => r.initiated_by || "—" },
            { key: "verifier", header: "Verifier", render: (r) => r.verifier || "—" },
            { key: "remarks", header: "Remarks", render: (r) => <span className="text-sm">{r.remarks || "N/A"}</span> },
            { key: "created_at", header: "Created At", render: (r) => (
              <div className="text-sm">
                <div className="font-semibold">{new Date(r.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div>
                <div className="text-muted-foreground">{new Date(r.created_at).toLocaleTimeString()}</div>
              </div>
            ) },
            { key: "updated_at", header: "Last Modified", render: (r) => (
              <div className="text-sm">
                <div className="font-semibold">{new Date(r.updated_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div>
                <div className="text-muted-foreground">{new Date(r.updated_at).toLocaleTimeString()}</div>
              </div>
            ) },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onView={() => setViewing(r)} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      {/* Initiate Payment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Initiate Multiple Payment</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <label className="text-sm font-medium">Consignment No <span className="text-destructive">*</span></label>
                <div className="mt-1 flex gap-2">
                  <Input
                    list="pay-consignments"
                    value={pickQuery}
                    onChange={(e) => setPickQuery(e.target.value)}
                    placeholder="Select any Consignment No"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addByQuery(); } }}
                  />
                  <datalist id="pay-consignments">
                    {pickerOptions.map((c) => <option key={c.id} value={c.bill_no}>{c.marka} — ¥{c.grand_total}</option>)}
                  </datalist>
                  <Button onClick={addByQuery} className="bg-gradient-primary text-primary-foreground shrink-0">Add</Button>
                </div>

                <div className="mt-4 overflow-hidden rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-primary text-primary-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">#</th>
                        <th className="px-3 py-2 text-left font-bold">Consignment No</th>
                        <th className="px-3 py-2 text-left font-bold">Bill Amount</th>
                        <th className="px-3 py-2 text-left font-bold">Discount</th>
                        <th className="px-3 py-2 text-left font-bold">Payment</th>
                        <th className="px-3 py-2 text-center font-bold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.rows.length === 0 ? (
                        <tr><td colSpan={6} className="p-6 text-center italic text-muted-foreground">No Data Found</td></tr>
                      ) : form.rows.map((r, idx) => (
                        <tr key={r.consignment_id} className="border-t border-border">
                          <td className="p-2">{idx + 1}</td>
                          <td className="p-2">{r.bill_no}</td>
                          <td className="p-2">¥ {Number(r.bill_amount).toLocaleString()}</td>
                          <td className="p-2">
                            <Input type="number" value={r.discount} onChange={(e) => updateRow(r.consignment_id, { discount: Number(e.target.value) })} className="h-8 w-24" />
                          </td>
                          <td className="p-2">
                            <Input type="number" value={r.payment} onChange={(e) => updateRow(r.consignment_id, { payment: Number(e.target.value) })} className="h-8 w-28" />
                          </td>
                          <td className="p-2 text-center">
                            <button onClick={() => removeRow(r.consignment_id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold">Summary</div>
                <div className="space-y-2 text-sm">
                  <Row label="Sub Total" value={`¥ ${subTotal.toLocaleString()}`} />
                  <Row label="Paid Amount" value={`¥ ${totalPayment.toLocaleString()}`} />
                  <Row label="Discount Amount" value={`¥ ${totalDiscount.toLocaleString()}`} />
                  <Row label="Remaining Amount" value={`¥ ${remaining.toLocaleString()}`} />
                </div>
              </div>
            </div>

            {/* RIGHT */}
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Payment Details:</div>
                <div className="space-y-3">
                  <F label="Amount *">
                    <div className="flex gap-2">
                      <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="eg. 5000" />
                      <Button onClick={calculate} className="bg-gradient-primary text-primary-foreground shrink-0">Calculate</Button>
                    </div>
                  </F>
                  <F label="Verifier *">
                    <Input value={form.verifier} onChange={(e) => setForm({ ...form, verifier: e.target.value })} placeholder="Choose any verifier" />
                  </F>
                  <F label="Receipt">
                    <label
                      className="block cursor-pointer rounded-lg border-2 border-dashed border-primary/50 bg-background p-6 text-center text-sm hover:border-primary"
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const f = e.dataTransfer.files?.[0];
                        if (f) onUpload(f);
                      }}
                    >
                      {form.receipt_url ? (
                        <img src={form.receipt_url} alt="receipt" className="mx-auto max-h-32 rounded" />
                      ) : (
                        <>
                          <div className="text-muted-foreground">Drag your file(s) to start uploading</div>
                          <div className="my-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"><span className="h-px w-12 bg-border" />OR<span className="h-px w-12 bg-border" /></div>
                          <span className="inline-flex items-center gap-2 rounded border border-primary px-3 py-1 text-primary">
                            <Upload className="h-3.5 w-3.5" />{uploading ? "Uploading…" : "Browse Files"}
                          </span>
                        </>
                      )}
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])} />
                    </label>
                  </F>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 text-base font-semibold text-primary">Payment Remarks:</div>
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

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
          {viewing && (
            <div className="bg-background">
              {/* Gradient header */}
              <div className="bg-gradient-primary text-primary-foreground p-6 relative">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-white/20 p-2.5"><ReceiptIcon className="h-6 w-6" /></div>
                  <div>
                    <div className="text-xs uppercase tracking-wider opacity-80">Payment Receipt</div>
                    <div className="text-2xl font-extrabold">¥ {Number(viewing.amount).toLocaleString()}</div>
                    <div className="text-xs opacity-90 mt-0.5">ID: {viewing.id.slice(0, 8)} · {new Date(viewing.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                  <span className={cn(
                    "inline-flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-semibold border-2",
                    viewing.status === "Approved" && "bg-emerald-500/20 border-emerald-300 text-white",
                    viewing.status === "Rejected" && "bg-destructive/30 border-destructive text-white",
                    viewing.status === "Pending" && "bg-amber-500/20 border-amber-300 text-white",
                  )}>
                    <CheckCircle2 className="h-4 w-4" /> {viewing.status}
                  </span>
                </div>
              </div>

              {/* Summary tiles */}
              <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatTile icon={<Wallet className="h-4 w-4" />} label="Sub Total" value={`¥ ${Number(viewing.sub_total).toLocaleString()}`} tone="default" />
                <StatTile icon={<BadgeCheck className="h-4 w-4" />} label="Paid Amount" value={`¥ ${Number(viewing.paid_amount || viewing.amount).toLocaleString()}`} tone="success" />
                <StatTile icon={<FileText className="h-4 w-4" />} label="Discount" value={`¥ ${Number(viewing.discount).toLocaleString()}`} tone="warning" />
                <StatTile icon={<Wallet className="h-4 w-4" />} label="Remaining" value={`¥ ${Number(viewing.remaining_amount).toLocaleString()}`} tone={Number(viewing.remaining_amount) > 0 ? "destructive" : "default"} />
              </div>

              {/* Meta + Receipt */}
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-3">
                  <div className="rounded-lg border border-border bg-card p-4">
                    <div className="text-sm font-bold mb-3 text-primary flex items-center gap-2"><User className="h-4 w-4" /> Payment Information</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <MetaRow label="Initiated By" value={viewing.initiated_by || "—"} />
                      <MetaRow label="Verifier" value={viewing.verifier || "—"} />
                      <MetaRow label="Created" value={new Date(viewing.created_at).toLocaleString()} />
                      <MetaRow label="Last Modified" value={new Date(viewing.updated_at).toLocaleString()} />
                      {viewing.remarks && <div className="col-span-2"><MetaRow label="Remarks" value={viewing.remarks} /></div>}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border overflow-hidden">
                    <div className="bg-gradient-primary text-primary-foreground px-4 py-2 text-sm font-bold flex items-center justify-between">
                      <span>Consignment Breakdown</span>
                      <span className="text-xs opacity-90">{(viewing.consignment_details || []).length} item(s)</span>
                    </div>
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left font-semibold">#</th>
                          <th className="p-2 text-left font-semibold">Consignment No</th>
                          <th className="p-2 text-right font-semibold">Bill Amount</th>
                          <th className="p-2 text-right font-semibold">Discount</th>
                          <th className="p-2 text-right font-semibold">Payment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(viewing.consignment_details || []).length === 0 ? (
                          <tr><td colSpan={5} className="p-6 text-center text-muted-foreground italic">No consignments</td></tr>
                        ) : (viewing.consignment_details || []).map((r, i) => (
                          <tr key={r.consignment_id} className="border-t border-border">
                            <td className="p-2 text-muted-foreground">{i + 1}</td>
                            <td className="p-2 font-medium">{r.bill_no}</td>
                            <td className="p-2 text-right">¥ {Number(r.bill_amount).toLocaleString()}</td>
                            <td className="p-2 text-right text-warning">¥ {Number(r.discount).toLocaleString()}</td>
                            <td className="p-2 text-right font-bold text-emerald-600">¥ {Number(r.payment).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <div className="text-sm font-bold mb-3 text-primary flex items-center gap-2"><ReceiptIcon className="h-4 w-4" /> Receipt</div>
                  {viewing.receipt_url ? (
                    <a href={viewing.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                      <img src={viewing.receipt_url} alt="receipt" className="w-full rounded-md border border-border hover:opacity-90 transition" />
                      <div className="text-xs text-primary mt-2 underline">Open full size →</div>
                    </a>
                  ) : (
                    <div className="text-xs text-muted-foreground italic py-8 text-center border border-dashed border-border rounded-md">No receipt uploaded</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StatTile = ({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "default" | "success" | "warning" | "destructive" }) => {
  const tones: Record<string, string> = {
    default: "bg-card border-border text-foreground",
    success: "bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
    warning: "bg-warning/10 border-warning/40 text-warning",
    destructive: "bg-destructive/10 border-destructive/40 text-destructive",
  };
  return (
    <div className={cn("rounded-lg border-2 p-3", tones[tone])}>
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold opacity-80">{icon} {label}</div>
      <div className="text-lg font-extrabold mt-1">{value}</div>
    </div>
  );
};
const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
    <div className="text-sm font-medium mt-0.5">{value}</div>
  </div>
);

const SF = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><div className="mb-1 text-xs font-medium text-muted-foreground">{label}</div>{children}</div>
);
const F = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div><div className="mb-1 text-sm font-medium">{label}</div>{children}</div>
);
const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between border-b border-dashed border-border pb-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

export default Payments;
