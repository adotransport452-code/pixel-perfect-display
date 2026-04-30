import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, FileDown, Copy, Download, Pencil, Printer, ZoomIn, ZoomOut, Maximize2, Languages } from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import { PageHeader } from "@/components/PageHeader";
import { ActionButtons } from "@/components/ActionButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ConsignmentForm } from "@/components/ConsignmentForm";
import { ConsignmentReceipt } from "@/components/ConsignmentReceipt";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { exportToExcel } from "@/lib/excel";
import { api, Shipment, Consignment } from "@/lib/store";

const ShipmentDetails = () => {
  const { id } = getRouteApi("/shipments/$id").useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [search, setSearch] = useState("");
  const [viewConsignment, setViewConsignment] = useState<Consignment | null>(null);
  const [editConsignment, setEditConsignment] = useState<Consignment | null>(null);
  const [zoom, setZoom] = useState(1);
  const [translate, setTranslate] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const BASE_W = 1500;

  const zoomIn = () => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)));
  const zoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const zoomReset = () => setZoom(1);

  const load = async () => {
    if (!id) return;
    try {
      const all = await api.shipments.list();
      const s = all.find((x) => x.id === id);
      if (!s) { toast.error("Shipment not found"); navigate({ to: "/shipments" }); return; }
      setShipment(s);
      const cons = await api.consignments.list();
      setConsignments(cons.filter((c) => s.consignment_ids.includes(c.id)));
    } catch (e: any) { toast.error(e.message); }
  };
  useEffect(() => { load(); }, [id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return consignments;
    return consignments.filter((c) => [c.bill_no, c.marka, c.description, c.ctn_no, c.remarks]
      .filter(Boolean).join(" ").toLowerCase().includes(q));
  }, [consignments, search]);

  const totals = filtered.reduce((acc, c) => {
    acc.cbm += Number(c.cbm || 0);
    acc.weight += Number(c.weight || 0);
    acc.freight += Number(c.freight || 0);
    acc.local_freight += Number(c.local_freight || 0);
    acc.bill_charge += Number(c.bill_charge || 0);
    acc.insurance += Number(c.insurance || 0);
    acc.tax += Number(c.tax || 0);
    acc.other += Number(c.packaging_fee || 0) + Number(c.loading_fee || 0) + Number(c.unloading_fee || 0);
    acc.total += Number(c.grand_total || 0);
    return acc;
  }, { cbm: 0, weight: 0, freight: 0, local_freight: 0, bill_charge: 0, insurance: 0, tax: 0, other: 0, total: 0 });

  const exportConsignments = () => {
    if (!filtered.length) return toast.error("Nothing to export");
    const rows = filtered.map((c) => ({
      Date: new Date(c.start_date).toLocaleDateString(),
      "Consignment No.": c.bill_no, Brand: c.marka, Description: c.description,
      Cartoon: c.cartoon, "CTN No.": c.ctn_no, CBM: c.cbm, Weight: c.weight,
      Freight: Number(c.freight || 0), "Local Freight": Number(c.local_freight || 0),
      "Bill Charge": Number(c.bill_charge || 0), Insurance: Number(c.insurance || 0),
      "Other Charges": Number(c.packaging_fee || 0) + Number(c.loading_fee || 0) + Number(c.unloading_fee || 0),
      Tax: Number(c.tax || 0), Total: Number(c.grand_total || 0), Remarks: c.remarks,
    }));
    exportToExcel(rows, `shipment-${shipment?.lot_no}-consignments-${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const removeConsignmentRecord = async (c: Consignment) => {
    if (!confirm(`Delete consignment "${c.bill_no}"?`)) return;
    try { await api.consignments.remove(c.id); toast.success("Deleted"); load(); } catch (e: any) { toast.error(e.message); }
  };

  const renderReceiptPng = async () => {
    if (!receiptRef.current) throw new Error("Receipt not ready");
    return await toPng(receiptRef.current, { pixelRatio: 2, cacheBust: true, backgroundColor: "#ffffff" });
  };
  const downloadReceipt = async () => {
    try {
      const dataUrl = await renderReceiptPng();
      const a = document.createElement("a");
      a.download = `consignment-${viewConsignment?.bill_no || "receipt"}.png`;
      a.href = dataUrl; a.click();
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

  if (!shipment) return <div className="p-6">Loading…</div>;

  return (
    <div>
      <PageHeader
        title={`Shipment: ${shipment.lot_no}`}
        breadcrumbs={[{ label: "Home" }, { label: "Shipments" }, { label: shipment.lot_no }]}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/shipments" })}><ArrowLeft className="mr-1 h-4 w-4" />Back</Button>
        }
      />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Info label="Lot No" value={shipment.lot_no} />
          <Info label="Status" value={shipment.status} />
          <Info label="Container" value={`${shipment.container_name} (${shipment.container_type})`} />
          <Info label="Driver" value={`${shipment.driver_name || "—"} · ${shipment.driver_phone || "—"}`} />
          <Info label="From" value={shipment.start_station} />
          <Info label="To" value={shipment.end_station} />
          <Info label="Dispatched By" value={shipment.dispatched_by || "—"} />
          <Info label="Consignments" value={String(shipment.consignment_ids.length)} />
        </div>

        {shipment.container_image_url && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-sm font-semibold text-primary mb-2">Container Image</div>
            <img src={shipment.container_image_url} alt="Container" className="max-h-80 rounded-md object-contain" />
          </div>
        )}

        {shipment.remarks && (
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-sm font-semibold text-primary mb-1">Remarks</div>
            <div className="text-sm">{shipment.remarks}</div>
          </div>
        )}

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="text-base font-semibold text-primary">Consignments in this shipment</div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search consignments…" className="pl-7 h-9 w-64" />
              </div>
              <Button size="sm" variant="outline" onClick={exportConsignments}><FileDown className="mr-1 h-4 w-4" />Export</Button>
            </div>
          </div>
          <div className="overflow-auto rounded-lg border border-border" style={{ maxHeight: "calc(100vh - 380px)" }}>
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="bg-gradient-primary text-primary-foreground sticky top-0 z-30">
                <tr className="text-left">
                  {["Date","Consignment No.","Brand","Description","Cartoon","CTN No.","CBM","Weight","Freight","Local Freight","Bill Charge","Insurance","Other Charges","Tax","Total","Remarks","Actions"].map((h) => {
                    const isBrand = h === "Brand", isCartoon = h === "Cartoon", isActions = h === "Actions";
                    return (
                      <th key={h} className={`px-3 py-2 font-bold text-xs uppercase tracking-wider whitespace-nowrap ${isBrand ? "!bg-amber-500 !text-white" : ""} ${isCartoon ? "!bg-emerald-500 !text-white" : ""} ${isActions ? "sticky right-0 z-40 bg-gradient-primary shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.25)]" : ""}`}>{h}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {consignments.length === 0 ? (
                  <tr><td colSpan={17} className="px-4 py-8 text-center text-muted-foreground">No consignments</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={17} className="px-4 py-8 text-center text-muted-foreground">No matching consignments</td></tr>
                ) : filtered.map((c) => {
                  const other = Number(c.packaging_fee || 0) + Number(c.loading_fee || 0) + Number(c.unloading_fee || 0);
                  return (
                    <tr key={c.id} className="group hover:bg-accent/30">
                      <td className="px-3 py-2 whitespace-nowrap border-t border-border bg-card group-hover:bg-accent/30">{new Date(c.start_date).toLocaleDateString()}</td>
                      <td className="px-3 py-2 border-t border-border bg-card group-hover:bg-accent/30"><Badge variant="secondary" className="bg-primary/10 text-primary">{c.bill_no}</Badge></td>
                      <td className="px-3 py-2 font-semibold border-t border-border bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">{c.marka || "—"}</td>
                      <td className="px-3 py-2 max-w-[220px] truncate border-t border-border bg-card group-hover:bg-accent/30" title={c.description || ""}>{c.description || "—"}</td>
                      <td className="px-3 py-2 text-center font-semibold border-t border-border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200">{c.cartoon}</td>
                      <td className="px-3 py-2 border-t border-border bg-card group-hover:bg-accent/30">{c.ctn_no || "—"}</td>
                      <td className="px-3 py-2 text-center border-t border-border bg-card group-hover:bg-accent/30">{c.cbm}</td>
                      <td className="px-3 py-2 text-center border-t border-border bg-card group-hover:bg-accent/30">{c.weight}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.freight || 0))}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.local_freight || 0))}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.bill_charge || 0))}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.insurance || 0))}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(other)}</td>
                      <td className="px-3 py-2 text-right border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.tax || 0))}</td>
                      <td className="px-3 py-2 text-right font-semibold border-t border-border bg-card group-hover:bg-accent/30">¥ {Math.round(Number(c.grand_total || 0))}</td>
                      <td className="px-3 py-2 max-w-[180px] truncate border-t border-border bg-card group-hover:bg-accent/30" title={c.remarks || ""}>{c.remarks || "—"}</td>
                      <td className="px-3 py-2 border-t border-border bg-card group-hover:bg-accent/30 sticky right-0 z-20 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.15)]"><ActionButtons onView={() => setViewConsignment(c)} onEdit={() => setEditConsignment(c)} onDelete={() => removeConsignmentRecord(c)} /></td>
                    </tr>
                  );
                })}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={6}>Totals</td>
                    <td className="px-3 py-2 text-center">{totals.cbm.toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">{totals.weight.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.freight)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.local_freight)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.bill_charge)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.insurance)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.other)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.tax)}</td>
                    <td className="px-3 py-2 text-right">¥ {Math.round(totals.total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Receipt viewer */}
      <Dialog open={!!viewConsignment} onOpenChange={(o) => { if (!o) { setViewConsignment(null); zoomReset(); setTranslate(false); } }}>
        <DialogContent className="w-[97vw] max-w-[1700px] max-h-[95vh] overflow-hidden p-4 sm:p-6 flex flex-col">
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
                <Button size="sm" variant="outline" onClick={() => { if (viewConsignment) { setEditConsignment(viewConsignment); setViewConsignment(null); } }}><Pencil className="mr-1 h-4 w-4" />Edit</Button>
                <Button size="sm" variant={translate ? "default" : "outline"} onClick={() => setTranslate((t) => !t)}><Languages className="mr-1 h-4 w-4" />{translate ? "Original" : "Translate to English"}</Button>
                <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" />Print</Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-muted/20 p-3">
            {viewConsignment && (
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div>
                    <ConsignmentReceipt ref={receiptRef} c={viewConsignment} width={Math.round(BASE_W * zoom)} translate={translate} />
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

      <Dialog open={!!editConsignment} onOpenChange={(o) => { if (!o) setEditConsignment(null); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Consignment</DialogTitle></DialogHeader>
          {editConsignment && (
            <ConsignmentForm
              initialData={editConsignment}
              onSaved={() => { setEditConsignment(null); load(); }}
              onCancel={() => setEditConsignment(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-card to-accent/20 p-3 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground break-words">{value || "—"}</div>
    </div>
  );
}

export default ShipmentDetails;
