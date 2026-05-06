import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Printer, Copy, Download, Pencil, ZoomIn, ZoomOut, Maximize2, Languages, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConsignmentForm } from "@/components/ConsignmentForm";
import { ConsignmentReceipt } from "@/components/ConsignmentReceipt";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { ImportConsignments } from "@/components/ImportConsignments";
import { exportStyledExcel, objectsToTable } from "@/lib/excelExport";
import { api, Consignment } from "@/lib/store";

const ALL = "__all__";
const STATION_OPTIONS = ["Guangzhou", "Yiwu", "Lhasa", "Nylam (Khasa)", "Tatopani", "Kerung", "Kathmandu", "Nylam", "Shantou"];

const consignmentToExportRow = (c: Consignment) => ({
  Date: c.start_date,
  "Consignment No.": c.bill_no,
  Brand: c.marka,
  "CTN No.": c.ctn_no || "",
  CBM: c.cbm,
  Weight: c.weight,
  Cartoon: c.cartoon,
  Quantity: c.quantity,
  Client: c.client_name || "",
  "Client Phone": c.client_phone || "",
  "Start Station": c.start_station,
  "Current At": c.current_station || "",
  "End Station": c.end_station,
  Description: c.description || "",
  "Trade Mode": c.trade_mode || "",
  Freight: c.freight,
  "Local Freight": c.local_freight,
  "Bill Charge": c.bill_charge,
  Insurance: c.insurance,
  Tax: c.tax,
  "Packaging Fee": c.packaging_fee,
  "Loading Fee": c.loading_fee,
  "Unloading Fee": c.unloading_fee,
  "Sub Total": c.sub_total,
  "Advance Amount": c.advance_amount,
  "Grand Total": c.grand_total,
  Status: c.status,
  "Payment Status": c.payment_status || "",
  Remarks: c.remarks || "",
});

const Consignments = () => {
  const [items, setItems] = useState<Consignment[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Consignment | null>(null);
  const [viewing, setViewing] = useState<Consignment | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState(false);

  // Filter bar state
  const [search, setSearch] = useState("");
  const [billNo, setBillNo] = useState("");
  const [brand, setBrand] = useState(ALL);
  const [startStation, setStartStation] = useState(ALL);
  const [currentAt, setCurrentAt] = useState(ALL);
  const [endStation, setEndStation] = useState(ALL);
  const [client, setClient] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [paymentStatus, setPaymentStatus] = useState(ALL);
  const [order, setOrder] = useState<"DESC" | "ASC">("DESC");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const receiptRef = useRef<HTMLDivElement>(null);
  const BASE_W = 1500;
  const zoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const renderReceiptPng = async () => {
    if (!receiptRef.current) throw new Error("Receipt not ready");
    return await toPng(receiptRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  };

  const downloadReceipt = async () => {
    try {
      const dataUrl = await renderReceiptPng();
      const link = document.createElement("a");
      link.download = `consignment-${viewing?.bill_no || "receipt"}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Downloaded");
    } catch (e: any) { toast.error(e.message || "Download failed"); }
  };

  const copyReceipt = async () => {
    try {
      const dataUrl = await renderReceiptPng();
      const blob = await (await fetch(dataUrl)).blob();
      // @ts-ignore
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("Copied to clipboard");
    } catch (e: any) { toast.error(e.message || "Copy failed"); }
  };

  const editReceipt = () => {
    if (viewing) { setEditing(viewing); setViewing(null); setFormOpen(true); }
  };

  const load = () => api.consignments.list().then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);

  const uniq = (arr: (string | null | undefined)[]) => Array.from(new Set(arr.filter(Boolean) as string[]));
  const brandOpts = useMemo(() => uniq(items.map((i) => i.marka)), [items]);
  const clientOpts = useMemo(() => uniq(items.map((i) => i.client_name)), [items]);
  const stationOpts = useMemo(() => uniq([...STATION_OPTIONS, ...items.flatMap((i) => [i.start_station, i.end_station, i.current_station])]), [items]);

  const filtered = useMemo(() => {
    let out = items.filter((c) => {
      if (search && ![c.bill_no, c.marka, c.start_station, c.end_station, c.client_name, c.ctn_no, c.description].filter(Boolean).join(" ").toLowerCase().includes(search.toLowerCase())) return false;
      if (billNo && !(c.bill_no || "").toLowerCase().includes(billNo.toLowerCase())) return false;
      if (brand && brand !== ALL && !(c.marka || "").toLowerCase().includes(brand.toLowerCase())) return false;
      if (startStation !== ALL && c.start_station !== startStation) return false;
      if (currentAt !== ALL && (c.current_station || c.start_station) !== currentAt) return false;
      if (endStation !== ALL && c.end_station !== endStation) return false;
      if (client && client !== ALL && !(c.client_name || "").toLowerCase().includes(client.toLowerCase())) return false;
      if (status && status !== ALL && !(c.status || "").toLowerCase().includes(status.toLowerCase())) return false;
      if (paymentStatus !== ALL && (c.payment_status || "Unpaid") !== paymentStatus) return false;
      if (startDate && c.start_date < startDate) return false;
      if (endDate && c.start_date > endDate) return false;
      return true;
    });
    out = [...out].sort((a, b) => order === "DESC" ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date));
    return out;
  }, [items, search, billNo, brand, startStation, currentAt, endStation, client, status, paymentStatus, order, startDate, endDate]);

  const remove = async (c: Consignment) => {
    if (!confirm(`Delete consignment "${c.bill_no}"?`)) return;
    try { await api.consignments.remove(c.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const toggleRow = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? filtered.map((c) => c.id) : []);

  const doExport = async (data: Consignment[], name: string) => {
    const objs = data.map(consignmentToExportRow);
    const { headers, rows } = objectsToTable(objs);
    await exportStyledExcel({ filename: name, sheetName: "Consignments", headers, rows });
  };
  const exportSelected = () => {
    const rows = items.filter((c) => selectedIds.includes(c.id));
    if (!rows.length) return toast.error("Select at least one row");
    doExport(rows, `consignments-selected-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportFiltered = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    doExport(filtered, `consignments-filtered-${new Date().toISOString().slice(0,10)}.xlsx`);
  };
  const exportAll = () => {
    if (!items.length) return toast.error("Nothing to export");
    doExport(items, `consignments-all-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div>
      <PageHeader
        title="Consignments"
        breadcrumbs={[{ label: "Home" }, { label: "Consignments" }]}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}><Upload className="mr-1 h-4 w-4" />Import</Button>
            <Button variant="outline" onClick={exportSelected} disabled={selectedIds.length === 0}><FileDown className="mr-1 h-4 w-4" />Export Selected ({selectedIds.length})</Button>
            <Button onClick={() => { setEditing(null); setFormOpen(true); }} className="bg-gradient-primary text-primary-foreground"><Plus className="mr-1 h-4 w-4" />Create Consignment</Button>
          </>
        }
      />
      <div className="p-6">
        {/* Filter bar */}
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-4 lg:grid-cols-8">
          <FilterField label="Search"><div className="relative"><Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="eg. Search…" className="pl-7 h-9" /></div></FilterField>
          <FilterField label="BillNo"><Input value={billNo} onChange={(e) => setBillNo(e.target.value)} placeholder="eg. 11" className="h-9" /></FilterField>
          <ComboField label="Brand" value={brand} onChange={setBrand} options={brandOpts} listId="brand-opts" />
          <SelectField label="Start Station" value={startStation} onChange={setStartStation} options={stationOpts} />
          <SelectField label="Current At" value={currentAt} onChange={setCurrentAt} options={stationOpts} />
          <SelectField label="End Station" value={endStation} onChange={setEndStation} options={stationOpts} />
          <ComboField label="Client" value={client} onChange={setClient} options={clientOpts} listId="client-opts" />
          <ComboField label="Status" value={status} onChange={setStatus} options={["Pending", "In Transit", "Delivered", "Cancelled"]} listId="status-opts" />
          <SelectField label="Payment Status" value={paymentStatus} onChange={setPaymentStatus} options={["Unpaid", "Partial", "Paid"]} />
          <FilterField label="Order"><Select value={order} onValueChange={(v) => setOrder(v as any)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="DESC">DESC</SelectItem><SelectItem value="ASC">ASC</SelectItem></SelectContent></Select></FilterField>
          <FilterField label="Start Date"><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9" /></FilterField>
          <FilterField label="End Date"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9" /></FilterField>
          <div className="flex items-end gap-2">
            <Button variant="outline" className="h-9 flex-1 text-primary border-primary/40" onClick={exportFiltered}>Export</Button>
            <Button variant="outline" className="h-9 flex-1 text-primary border-primary/40" onClick={exportAll}>Export All</Button>
          </div>
        </div>

        <div className="mb-3 text-sm text-muted-foreground">Showing {filtered.length} of {items.length}</div>
        <DataTable<Consignment>
          data={filtered}
          maxHeight="calc(100vh - 360px)"
          selectable
          selectedIds={selectedIds}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
          columns={[
            { key: "date", header: "Date", render: (r) => <span className="text-sm">{new Date(r.start_date).toLocaleDateString()}</span> },
            { key: "bill_no", header: "Consignment No.", render: (r) => <Badge variant="secondary" className="bg-primary/10 text-primary">{r.bill_no}</Badge> },
            { key: "marka", header: "Brand", className: "bg-amber-50 dark:bg-amber-950/30", headerClassName: "!bg-amber-500 !text-white", render: (r) => <span className="font-semibold text-amber-900 dark:text-amber-200">{r.marka || "—"}</span> },
            { key: "ctn_no", header: "CTN No.", render: (r) => <span className="text-sm">{r.ctn_no || "—"}</span> },
            { key: "cbm", header: "CBM" },
            { key: "weight", header: "Weight" },
            { key: "cartoon", header: "Cartoon", className: "bg-emerald-50 dark:bg-emerald-950/30 font-semibold text-emerald-900 dark:text-emerald-200", headerClassName: "!bg-emerald-500 !text-white" },
            { key: "quantity", header: "Quantity" },
            { key: "client", header: "Client", render: (r) => r.client_name || "—" },
            { key: "grand_total", header: "Total", render: (r) => <span className="font-semibold">¥ {Number(r.grand_total).toFixed(2)}</span> },
            { key: "dues", header: "Dues", render: (r) => {
              const dues = Number(r.grand_total || 0) - Number(r.advance_amount || 0);
              return <span className={dues > 0 ? "text-destructive font-medium" : "text-muted-foreground"}>¥ {dues.toFixed(2)}</span>;
            }},
            { key: "status", header: "Status", render: (r) => <Badge variant="outline">{r.status}</Badge> },
            { key: "payment_status", header: "Payment", render: (r) => {
              const ps = r.payment_status || "Unpaid";
              const cls = ps === "Paid" ? "bg-primary/15 text-primary" : ps === "Partial" ? "bg-warning/20 text-warning" : "bg-destructive/10 text-destructive";
              return <Badge variant="secondary" className={cls}>{ps}</Badge>;
            }},
            { key: "description", header: "Description", render: (r) => <span className="text-sm text-muted-foreground" title={r.description || ""}>{r.description || "—"}</span> },
            { key: "start_station", header: "Start Station", render: (r) => <Badge variant="outline">{r.start_station || "—"}</Badge> },
            { key: "current_station", header: "Current At", render: (r) => <Badge variant="outline" className="bg-accent/40">{r.current_station || r.start_station || "—"}</Badge> },
            { key: "end_station", header: "End Station", render: (r) => <Badge variant="outline">{r.end_station || "—"}</Badge> },
            { key: "created_by", header: "Created By", render: (r) => <span className="text-sm">{r.created_by || "—"}</span> },
            { key: "created_at", header: "Created At", render: (r) => {
              const d = new Date(r.created_at);
              return (
                <div className="text-sm min-w-[140px]">
                  <div className="font-semibold">{d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "2-digit", year: "numeric" })}</div>
                  <div className="text-primary">{d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</div>
                </div>
              );
            } },
            { key: "actions", header: "Actions", render: (r) => <ActionButtons onView={() => setViewing(r)} onEdit={() => { setEditing(r); setFormOpen(true); }} onDelete={() => remove(r)} /> },
          ]}
        />
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Consignment" : "Create Consignment"}</DialogTitle></DialogHeader>
          <ConsignmentForm initialData={editing} onSaved={() => { setFormOpen(false); load(); }} onCancel={() => setFormOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Import Consignments</DialogTitle></DialogHeader>
          <ImportConsignments onDone={() => { setImportOpen(false); load(); }} onCancel={() => setImportOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(o) => { if (!o) { setViewing(null); zoomReset(); setTranslate(false); } }}>
        <DialogContent className="w-[97vw] max-w-[1600px] max-h-[95vh] overflow-hidden p-4 sm:p-6 flex flex-col">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
              <DialogTitle>Consignment Receipt</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 px-1 py-0.5">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={zoomOut} title="Zoom out"><ZoomOut className="h-4 w-4" /></Button>
                  <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums">{Math.round(zoom * 100)}%</span>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={zoomIn} title="Zoom in"><ZoomIn className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={zoomReset} title="Reset zoom"><Maximize2 className="h-4 w-4" /></Button>
                </div>
                <Button size="sm" variant="outline" onClick={copyReceipt}><Copy className="mr-1 h-4 w-4" />Copy</Button>
                <Button size="sm" variant="outline" onClick={downloadReceipt}><Download className="mr-1 h-4 w-4" />Download</Button>
                <Button size="sm" variant="outline" onClick={editReceipt}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
                <Button size="sm" variant={translate ? "default" : "outline"} onClick={() => setTranslate((t) => !t)}><Languages className="mr-1 h-4 w-4" />{translate ? "Original" : "Translate to English"}</Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print</Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-muted/20 p-3">
            {viewing && (
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div>
                    <ConsignmentReceipt ref={receiptRef} c={viewing} width={Math.round(BASE_W * zoom)} translate={translate} />
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem onClick={() => setTranslate((t) => !t)}>
                    <Languages className="mr-2 h-4 w-4" />
                    {translate ? "Show Original" : "Translate to English"}
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-xs text-primary font-medium">{label}</Label>{children}</div>;
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <FilterField label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9"><SelectValue placeholder="All" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All</SelectItem>
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </FilterField>
  );
}

function ComboField({ label, value, onChange, options, listId }: { label: string; value: string; onChange: (v: string) => void; options: string[]; listId: string }) {
  const display = value === ALL ? "" : value;
  return (
    <FilterField label={label}>
      <div className="relative">
        <Input
          list={listId}
          value={display}
          onChange={(e) => onChange(e.target.value === "" ? ALL : e.target.value)}
          placeholder="All — type or pick"
          className="h-9 pr-7"
        />
        {display && (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => onChange(ALL)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
          >
            ✕
          </button>
        )}
        <datalist id={listId}>
          {options.map((o) => <option key={o} value={o} />)}
        </datalist>
      </div>
    </FilterField>
  );
}

export default Consignments;