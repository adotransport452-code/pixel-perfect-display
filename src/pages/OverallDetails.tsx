import { useEffect, useMemo, useRef, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageHeader } from "@/components/PageHeader";
import { ActionButtons } from "@/components/ActionButtons";
import { api, type OverallDetail, type DestContainer, type LhasaContainer, type OverallStatus } from "@/lib/store";
import { exportToExcel, parseExcelFile } from "@/lib/excel";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Search, Upload, Download, Pencil, ChevronDown, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Origin = "Guangzhou" | "Yiwu";

const STATUSES: OverallStatus[] = [
  "On the way to Lhasa", "At Lhasa", "On the way to Nylam", "At Nylam",
  "On the way to Tatopani", "At Tatopani port", "On the way to Kerung", "At Kerung port",
  "Tatopani Delivered", "Kerung Delivered",
];
const DESTINATIONS = ["TATOPANI", "KERUNG", "TATOPANI-KERUNG", "KERUNG-TATOPANI", "NYLAM"];
const TATOPANI_STATUSES = ["On the way to Tatopani", "At Tatopani port"];
const KERUNG_STATUSES = ["On the way to Kerung", "At Kerung port"];

// ---------- Calculations (return null when input data not yet entered) ----------
function calcRemainingOrigin(r: OverallDetail): number | null {
  // Only fill if Loaded CTNs has been entered (>0)
  if (!r.loaded_ctns || Number(r.loaded_ctns) <= 0) return null;
  return Math.max(0, (Number(r.total_ctns) || 0) - (Number(r.loaded_ctns) || 0));
}
function calcRemainingLhasa(r: OverallDetail): number | null {
  // Only fill if Received CTNS at Nylam has been entered (>0)
  if (!r.received_ctns_at_nylam || Number(r.received_ctns_at_nylam) <= 0) return null;
  const loadedLhasa = (r.lhasa_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  return loadedLhasa - Number(r.received_ctns_at_nylam);
}
function calcRemainingNylam(r: OverallDetail): number | null {
  // Only fill if any Loaded CTN from Nylam to Tatopani/Kerung is filled
  const tat = (r.tatopani_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const ker = (r.kerung_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  if (tat <= 0 && ker <= 0) return null;
  return (Number(r.received_ctns_at_nylam) || 0) - tat - ker;
}
function calcOnTheWay(r: OverallDetail): number | null {
  // Only fill if any container has status "On the way to Tatopani/Kerung"
  let total = 0; let any = false;
  for (const c of r.tatopani_containers || []) if (c.status === "On the way to Tatopani") { total += Number(c.loaded_ctn) || 0; any = true; }
  for (const c of r.kerung_containers || []) if (c.status === "On the way to Kerung") { total += Number(c.loaded_ctn) || 0; any = true; }
  return any ? total : null;
}
function calcMissing(r: OverallDetail): number | null {
  // Only fill if status is "At X port" AND received_ctn is filled
  let total = 0; let any = false;
  for (const c of r.tatopani_containers || []) if (c.status === "At Tatopani port" && c.received_ctn != null && c.received_ctn !== undefined) { total += (Number(c.loaded_ctn) || 0) - Number(c.received_ctn); any = true; }
  for (const c of r.kerung_containers || []) if (c.status === "At Kerung port" && c.received_ctn != null && c.received_ctn !== undefined) { total += (Number(c.loaded_ctn) || 0) - Number(c.received_ctn); any = true; }
  return any ? total : null;
}
function isKerungDestination(d: string | null | undefined): boolean {
  if (!d) return false;
  const u = d.toUpperCase().replace(/\s+/g, "");
  return u.includes("KERUNG") || u.includes("KYIRONG") || u === "TATOPANI-KERUNG" || u === "KERUNG-TATOPANI";
}
const fmtNum = (n: number | null) => (n === null || n === undefined || Number.isNaN(n) ? "" : String(n));

function emptyRow(origin: Origin): Partial<OverallDetail> {
  return {
    origin, consignment_no: "", marka: "", total_ctns: 0, loaded_ctns: 0, cbm: 0, gw: 0,
    destination: "TATOPANI", lot_no: "", status: "On the way to Lhasa",
    lhasa_containers: [], lhasa_total_containers: 0,
    nylam_arrival_dates: [], received_ctns_at_nylam: 0,
    tatopani_containers: [], tatopani_total_containers: 0,
    kerung_containers: [], kerung_total_containers: 0,
    client: "", remarks: "",
  };
}

function makeDestContainer(): DestContainer {
  return { dispatched_from_nylam: null, loaded_ctn: 0, nylam_container: "", status: "On the way to Tatopani", received_ctn: null, arrival_date: null };
}
function makeLhasaContainer(): LhasaContainer {
  return { container_name: "", dispatched_from_lhasa: null, loaded_ctn: 0, arrived_at_nylam: null };
}

// ---------- Table component ----------
function OriginTable({ origin }: { origin: Origin }) {
  const { profile } = useAuth();
  const userTag = profile?.name || profile?.email || "system";

  const [rows, setRows] = useState<OverallDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [expandedLhasa, setExpandedLhasa] = useState<Set<string>>(new Set());
  const [expandedTat, setExpandedTat] = useState<Set<string>>(new Set());
  const [expandedKer, setExpandedKer] = useState<Set<string>>(new Set());

  const [editing, setEditing] = useState<OverallDetail | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [viewing, setViewing] = useState<OverallDetail | null>(null);
  const [masterOpen, setMasterOpen] = useState(false);
  const [tatBulkOpen, setTatBulkOpen] = useState(false);
  const [kerBulkOpen, setKerBulkOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Top scrollbar mirror
  const topScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const [tableWidth, setTableWidth] = useState(0);

  const load = async () => {
    setLoading(true);
    try { setRows(await api.overallDetails.list(origin)); }
    catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [origin]);

  useEffect(() => {
    const el = tableScrollRef.current; if (!el) return;
    const update = () => setTableWidth(el.scrollWidth);
    update();
    const ro = new ResizeObserver(update); ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length]);

  const onTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableScrollRef.current) tableScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };
  const onTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.consignment_no, r.marka, r.lot_no, r.client, r.destination, r.status, r.origin_container]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const toggleId = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  const toggleAll = (checked: boolean) => setSelectedIds(checked ? filtered.map((r) => r.id) : []);
  const toggleExpand = (set: Set<string>, setSet: (s: Set<string>) => void, id: string) => {
    const next = new Set(set); next.has(id) ? next.delete(id) : next.add(id); setSet(next);
  };

  const handleSave = async (data: Partial<OverallDetail>) => {
    try {
      const payload: Partial<OverallDetail> = { ...data, origin, updated_by: userTag };
      if (editing?.id) {
        await api.overallDetails.update(editing.id, payload);
        toast.success("Updated");
      } else {
        await api.overallDetails.create({ ...payload, created_by: userTag });
        toast.success("Added");
      }
      setEditOpen(false); setEditing(null); load();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this row?")) return;
    try { await api.overallDetails.remove(id); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message || "Delete failed"); }
  };

  const handleExport = () => {
    const flat = filtered.map((r) => ({
      Date: r.date, "Consignment No": r.consignment_no, MARKA: r.marka,
      "Total CTNS": r.total_ctns, "Loaded CTNS": r.loaded_ctns, CBM: r.cbm, GW: r.gw,
      Destination: r.destination, "LOT No": r.lot_no,
      [`Dispatched from ${origin}`]: r.dispatched_from_origin, [`${origin} Container`]: r.origin_container,
      Status: r.status, "Arrival at Lhasa": r.arrival_at_lhasa,
      "Nylam Dates": (r.nylam_arrival_dates || []).join(" | "), "Received at Nylam": r.received_ctns_at_nylam,
      "Tatopani Containers": JSON.stringify(r.tatopani_containers), "Kerung Containers": JSON.stringify(r.kerung_containers),
      [`Remaining at ${origin}`]: calcRemainingOrigin(r),
      "Remaining at Nylam": calcRemainingNylam(r), "On the Way": calcOnTheWay(r), "Missing CTN": calcMissing(r),
      Client: r.client, Remarks: r.remarks, "Created By": r.created_by, "Updated By": r.updated_by,
      "Last Modified": r.updated_at,
    }));
    exportToExcel(flat, `overall-details-${origin.toLowerCase()}`);
  };

  const handleImport = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      const inserts = parsed.map((p: any) => ({
        ...emptyRow(origin),
        consignment_no: String(p["Consignment No"] || p.consignment_no || ""),
        marka: p.MARKA || p.marka || "",
        total_ctns: Number(p["Total CTNS"] || 0),
        loaded_ctns: Number(p["Loaded CTNS"] || 0),
        cbm: Number(p.CBM || 0), gw: Number(p.GW || 0),
        destination: p.Destination || "TATOPANI",
        lot_no: p["LOT No"] || "",
        date: p.Date || null,
        client: p.Client || "",
        remarks: p.Remarks || "",
        created_by: userTag, updated_by: userTag,
      })).filter((r) => r.consignment_no);
      for (const ins of inserts) await api.overallDetails.create(ins);
      toast.success(`Imported ${inserts.length} rows`);
      load();
    } catch (e: any) { toast.error(e.message || "Import failed"); }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-6 pt-4">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search consignment, MARKA, LOT, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 w-72" />
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImport(f); e.target.value = ""; }} />
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> Smart Import</Button>
        <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
        <Button size="sm" onClick={() => { setEditing(null); setEditOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Add New</Button>
        <Button variant={selectMode ? "default" : "outline"} size="sm" onClick={() => { setSelectMode((v) => !v); setSelectedIds([]); }}>
          {selectMode ? "Cancel Select" : "Select"}
        </Button>
        {selectMode && selectedIds.length > 0 && (
          <>
            <span className="text-sm text-muted-foreground ml-2">{selectedIds.length} selected</span>
            <Button size="sm" variant="secondary" onClick={() => setMasterOpen(true)}><Pencil className="h-4 w-4 mr-1" /> Master Edit</Button>
            <Button size="sm" variant="secondary" onClick={() => setTatBulkOpen(true)}>TATOPANI Edit</Button>
            <Button size="sm" variant="secondary" onClick={() => setKerBulkOpen(true)}>KERUNG Edit</Button>
          </>
        )}
      </div>

      {/* Top scrollbar mirror (always visible) */}
      <div className="px-6">
        <div ref={topScrollRef} onScroll={onTopScroll} className="overflow-x-auto h-3 sticky top-0 z-20 bg-background">
          <div style={{ width: tableWidth, height: 1 }} />
        </div>
      </div>

      {/* Table */}
      <div className="px-6 pb-6">
        <div ref={tableScrollRef} onScroll={onTableScroll} className="overflow-auto rounded-lg border border-border bg-card shadow-card" style={{ maxHeight: "70vh" }}>
          <table className="w-max text-sm border-separate border-spacing-0">
            <thead className="sticky top-0 z-30">
              <tr>
                {selectMode && (
                  <th className="bg-gradient-primary px-3 py-2 border-b border-primary/30 sticky left-0 z-40 w-10">
                    <Checkbox
                      checked={filtered.length > 0 && filtered.every((r) => selectedIds.includes(r.id))}
                      onCheckedChange={(v) => toggleAll(!!v)}
                      className="border-primary-foreground bg-white/20 data-[state=checked]:bg-white data-[state=checked]:text-primary"
                    />
                  </th>
                )}
                {[
                  ["Date", 110], ["Consignment No.", 160, "sticky"], ["MARKA", 110], ["Total CTNS", 100], ["Loaded CTNS", 100],
                  ["CBM", 80], ["GW", 80], ["Destination", 140], ["LOT No.", 110],
                  [`Dispatched from ${origin}`, 150], [`${origin} Container`, 150], ["Status", 170],
                  ["Arrival at Lhasa", 130], ["LHASA", 90], ["Nylam Arrival Dates", 180], ["Received CTNS at Nylam", 140],
                  ["KERUNG", 90], ["TATOPANI", 90],
                  [`Remaining CTN at ${origin}`, 150, "hl"], ["Remaining CTN at Lhasa", 150, "hl"],
                  ["Remaining CTN at Nylam", 150, "hl"], ["On the Way", 110, "hl"], ["Missing CTN", 110, "hl"],
                  ["Client", 160], ["Remarks", 180], ["Created By", 120], ["Updated By", 120], ["Last Modified", 150],
                  ["Actions", 130, "stickyR"],
                ].map(([label, w, kind]: any) => {
                  const style: React.CSSProperties = { minWidth: w };
                  if (kind === "sticky") style.left = selectMode ? 40 : 0;
                  return (
                    <th key={label}
                      style={style}
                      className={cn(
                        "bg-gradient-primary px-3 py-2 font-bold text-[11px] uppercase tracking-wider text-primary-foreground border-b border-primary/30 whitespace-nowrap text-left",
                        kind === "sticky" && "sticky z-40",
                        kind === "stickyR" && "sticky right-0 z-40",
                        kind === "hl" && "bg-warning/90"
                      )}
                    >
                      {label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={29} className="px-4 py-12 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={29} className="px-4 py-12 text-center text-muted-foreground">No data found</td></tr>
              ) : filtered.map((r) => {
                const remOrigin = calcRemainingOrigin(r);
                const remNylam = calcRemainingNylam(r);
                const onWay = calcOnTheWay(r);
                const missing = calcMissing(r);
                const remLhasa = (Number(r.received_ctns_at_nylam) || 0) === 0
                  ? (r.lhasa_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0) - 0
                  : 0;
                return (
                  <tr key={r.id} className="group hover:bg-accent/30">
                    {selectMode && (
                      <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 sticky left-0 z-10">
                        <Checkbox checked={selectedIds.includes(r.id)} onCheckedChange={() => toggleId(r.id)} />
                      </td>
                    )}
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.date || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap font-semibold sticky z-10" style={{ left: selectMode ? 40 : 0 }}>{r.consignment_no}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.marka || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.total_ctns}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.loaded_ctns}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.cbm}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.gw}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.destination || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.lot_no || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.dispatched_from_origin || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.origin_container || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">{r.status}</span>
                    </td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.arrival_at_lhasa || "—"}</td>
                    {/* LHASA expand */}
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">
                      <button onClick={() => toggleExpand(expandedLhasa, setExpandedLhasa, r.id)} className="inline-flex items-center gap-1 text-primary text-xs font-semibold">
                        {expandedLhasa.has(r.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        LHASA ({r.lhasa_total_containers || (r.lhasa_containers || []).length})
                      </button>
                      {expandedLhasa.has(r.id) && (
                        <div className="mt-2 p-2 rounded border border-border bg-muted/40 text-xs space-y-1 min-w-[260px]">
                          {(r.lhasa_containers || []).map((c, i) => (
                            <div key={i} className="border-b border-border/50 pb-1">
                              <div><b>Container {i + 1}:</b> {c.container_name || "—"}</div>
                              <div>Dispatched: {c.dispatched_from_lhasa || "—"} | Loaded: {c.loaded_ctn}</div>
                              <div>Arrived Nylam: {c.arrived_at_nylam || "—"}</div>
                            </div>
                          ))}
                          {(!r.lhasa_containers || r.lhasa_containers.length === 0) && <div className="text-muted-foreground">No Lhasa containers</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{(r.nylam_arrival_dates || []).join(", ") || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">{r.received_ctns_at_nylam}</td>
                    {/* KERUNG expand */}
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">
                      <button onClick={() => toggleExpand(expandedKer, setExpandedKer, r.id)} className="inline-flex items-center gap-1 text-destructive text-xs font-semibold">
                        {expandedKer.has(r.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        KERUNG ({r.kerung_total_containers || (r.kerung_containers || []).length})
                      </button>
                      {expandedKer.has(r.id) && (
                        <div className="mt-2 p-2 rounded border border-border bg-muted/40 text-xs space-y-1 min-w-[260px]">
                          {(r.kerung_containers || []).map((c, i) => (
                            <div key={i} className="border-b border-border/50 pb-1">
                              <div><b>Container {i + 1}:</b> {c.nylam_container || "—"}</div>
                              <div>Dispatched: {c.dispatched_from_nylam || "—"} | Loaded: {c.loaded_ctn}</div>
                              <div>Status: {c.status} | Received: {c.received_ctn ?? "—"}</div>
                              <div>Arrival: {c.arrival_date || "—"}</div>
                            </div>
                          ))}
                          {(!r.kerung_containers || r.kerung_containers.length === 0) && <div className="text-muted-foreground">No Kerung containers</div>}
                        </div>
                      )}
                    </td>
                    {/* TATOPANI expand */}
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30">
                      <button onClick={() => toggleExpand(expandedTat, setExpandedTat, r.id)} className="inline-flex items-center gap-1 text-warning text-xs font-semibold">
                        {expandedTat.has(r.id) ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                        TATOPANI ({r.tatopani_total_containers || (r.tatopani_containers || []).length})
                      </button>
                      {expandedTat.has(r.id) && (
                        <div className="mt-2 p-2 rounded border border-border bg-muted/40 text-xs space-y-1 min-w-[260px]">
                          {(r.tatopani_containers || []).map((c, i) => (
                            <div key={i} className="border-b border-border/50 pb-1">
                              <div><b>Container {i + 1}:</b> {c.nylam_container || "—"}</div>
                              <div>Dispatched: {c.dispatched_from_nylam || "—"} | Loaded: {c.loaded_ctn}</div>
                              <div>Status: {c.status} | Received: {c.received_ctn ?? "—"}</div>
                              <div>Arrival: {c.arrival_date || "—"}</div>
                            </div>
                          ))}
                          {(!r.tatopani_containers || r.tatopani_containers.length === 0) && <div className="text-muted-foreground">No Tatopani containers</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 border-t border-border/60 bg-warning/10 group-hover:bg-warning/20 font-semibold text-warning-foreground">{remOrigin}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-warning/10 group-hover:bg-warning/20 font-semibold text-warning-foreground">{remLhasa}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-warning/10 group-hover:bg-warning/20 font-semibold text-warning-foreground">{remNylam}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-warning/10 group-hover:bg-warning/20 font-semibold text-warning-foreground">{onWay}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-destructive/10 group-hover:bg-destructive/20 font-semibold text-destructive">{missing}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.client || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 max-w-xs truncate">{r.remarks || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.created_by || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{r.updated_by || "—"}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 whitespace-nowrap">{new Date(r.updated_at).toLocaleString()}</td>
                    <td className="px-3 py-2 border-t border-border/60 bg-card group-hover:bg-accent/30 sticky right-0 z-10">
                      <ActionButtons
                        onView={() => setViewing(r)}
                        onEdit={() => { setEditing(r); setEditOpen(true); }}
                        onDelete={() => handleDelete(r.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit dialog */}
      <RowEditor
        open={editOpen}
        origin={origin}
        initial={editing}
        onClose={() => { setEditOpen(false); setEditing(null); }}
        onSave={handleSave}
      />

      {/* View dialog */}
      {viewing && (
        <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{viewing.consignment_no} — {viewing.marka}</DialogTitle></DialogHeader>
            <pre className="text-xs whitespace-pre-wrap bg-muted p-3 rounded">{JSON.stringify(viewing, null, 2)}</pre>
          </DialogContent>
        </Dialog>
      )}

      {/* Master Edit */}
      <MasterEditDialog
        open={masterOpen}
        origin={origin}
        ids={selectedIds}
        onClose={() => setMasterOpen(false)}
        onDone={() => { setMasterOpen(false); setSelectedIds([]); setSelectMode(false); load(); }}
      />

      {/* Tatopani / Kerung bulk */}
      <DestBulkEditDialog
        open={tatBulkOpen}
        kind="TATOPANI"
        rows={rows.filter((r) => selectedIds.includes(r.id))}
        onClose={() => setTatBulkOpen(false)}
        onDone={() => { setTatBulkOpen(false); setSelectedIds([]); setSelectMode(false); load(); }}
      />
      <DestBulkEditDialog
        open={kerBulkOpen}
        kind="KERUNG"
        rows={rows.filter((r) => selectedIds.includes(r.id))}
        onClose={() => setKerBulkOpen(false)}
        onDone={() => { setKerBulkOpen(false); setSelectedIds([]); setSelectMode(false); load(); }}
      />
    </div>
  );
}

// ---------- Row editor ----------
function RowEditor({ open, origin, initial, onClose, onSave }: {
  open: boolean; origin: Origin; initial: OverallDetail | null;
  onClose: () => void; onSave: (d: Partial<OverallDetail>) => void;
}) {
  const [form, setForm] = useState<Partial<OverallDetail>>(emptyRow(origin));

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : emptyRow(origin));
  }, [open, initial, origin]);

  const setF = <K extends keyof OverallDetail>(k: K, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const setLhasaCount = (n: number) => {
    const cur = [...(form.lhasa_containers || [])];
    while (cur.length < n) cur.push(makeLhasaContainer());
    while (cur.length > n) cur.pop();
    setForm((s) => ({ ...s, lhasa_total_containers: n, lhasa_containers: cur }));
  };
  const setTatCount = (n: number) => {
    const cur = [...(form.tatopani_containers || [])];
    while (cur.length < n) cur.push({ ...makeDestContainer(), status: "On the way to Tatopani" });
    while (cur.length > n) cur.pop();
    setForm((s) => ({ ...s, tatopani_total_containers: n, tatopani_containers: cur }));
  };
  const setKerCount = (n: number) => {
    const cur = [...(form.kerung_containers || [])];
    while (cur.length < n) cur.push({ ...makeDestContainer(), status: "On the way to Kerung" });
    while (cur.length > n) cur.pop();
    setForm((s) => ({ ...s, kerung_total_containers: n, kerung_containers: cur }));
  };

  const updateLhasa = (i: number, patch: Partial<LhasaContainer>) => {
    const arr = [...(form.lhasa_containers || [])]; arr[i] = { ...arr[i], ...patch };
    setForm((s) => ({ ...s, lhasa_containers: arr }));
  };
  const updateDest = (key: "tatopani_containers" | "kerung_containers", i: number, patch: Partial<DestContainer>) => {
    const arr = [...((form[key] as DestContainer[]) || [])]; arr[i] = { ...arr[i], ...patch };
    setForm((s) => ({ ...s, [key]: arr } as any));
  };

  const addNylamDate = () => setForm((s) => ({ ...s, nylam_arrival_dates: [...(s.nylam_arrival_dates || []), ""] }));
  const setNylamDate = (i: number, v: string) => {
    const arr = [...(form.nylam_arrival_dates || [])]; arr[i] = v;
    setForm((s) => ({ ...s, nylam_arrival_dates: arr }));
  };
  const removeNylamDate = (i: number) => setForm((s) => ({ ...s, nylam_arrival_dates: (s.nylam_arrival_dates || []).filter((_, j) => j !== i) }));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Edit" : "Add"} — {origin}</DialogTitle></DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label="Date"><Input type="date" value={form.date || ""} onChange={(e) => setF("date", e.target.value || null)} /></Field>
          <Field label="Consignment No."><Input value={form.consignment_no || ""} onChange={(e) => setF("consignment_no", e.target.value)} /></Field>
          <Field label="MARKA"><Input value={form.marka || ""} onChange={(e) => setF("marka", e.target.value)} /></Field>
          <Field label="LOT No."><Input value={form.lot_no || ""} onChange={(e) => setF("lot_no", e.target.value)} /></Field>
          <Field label="Total CTNS"><Input type="number" value={form.total_ctns ?? 0} onChange={(e) => setF("total_ctns", Number(e.target.value))} /></Field>
          <Field label="Loaded CTNS"><Input type="number" value={form.loaded_ctns ?? 0} onChange={(e) => setF("loaded_ctns", Number(e.target.value))} /></Field>
          <Field label="CBM"><Input type="number" step="0.01" value={form.cbm ?? 0} onChange={(e) => setF("cbm", Number(e.target.value))} /></Field>
          <Field label="GW"><Input type="number" step="0.01" value={form.gw ?? 0} onChange={(e) => setF("gw", Number(e.target.value))} /></Field>
          <Field label="Destination">
            <Select value={form.destination || ""} onValueChange={(v) => setF("destination", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={`Dispatched from ${origin}`}><Input type="date" value={form.dispatched_from_origin || ""} onChange={(e) => setF("dispatched_from_origin", e.target.value || null)} /></Field>
          <Field label={`${origin} Container`}><Input value={form.origin_container || ""} onChange={(e) => setF("origin_container", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status || ""} onValueChange={(v) => setF("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Arrival at Lhasa"><Input type="date" value={form.arrival_at_lhasa || ""} onChange={(e) => setF("arrival_at_lhasa", e.target.value || null)} /></Field>
          <Field label="Received CTNS at Nylam"><Input type="number" value={form.received_ctns_at_nylam ?? 0} onChange={(e) => setF("received_ctns_at_nylam", Number(e.target.value))} /></Field>
          <Field label="Client"><Input value={form.client || ""} onChange={(e) => setF("client", e.target.value)} /></Field>
        </div>

        {/* Nylam multi dates */}
        <div className="mt-4 rounded border border-border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">Arrival Dates at Nylam</div>
            <Button size="sm" variant="outline" onClick={addNylamDate}><Plus className="h-3 w-3 mr-1" /> Add date</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(form.nylam_arrival_dates || []).map((d, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input type="date" value={d || ""} onChange={(e) => setNylamDate(i, e.target.value)} />
                <button onClick={() => removeNylamDate(i)} className="text-destructive"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* LHASA section */}
        <ContainersSection
          title="LHASA"
          colorClass="text-primary"
          totalLabel="Total Containers"
          count={form.lhasa_total_containers ?? (form.lhasa_containers?.length || 0)}
          onCountChange={setLhasaCount}
        >
          {(form.lhasa_containers || []).map((c, i) => (
            <div key={i} className="border border-border rounded p-3 bg-muted/30 space-y-2">
              <div className="font-semibold text-sm text-center">Container {i + 1}</div>
              <Field label={`Lhasa-Nylam Container`}><Input value={c.container_name} onChange={(e) => updateLhasa(i, { container_name: e.target.value })} /></Field>
              <Field label="Dispatched from Lhasa"><Input type="date" value={c.dispatched_from_lhasa || ""} onChange={(e) => updateLhasa(i, { dispatched_from_lhasa: e.target.value || null })} /></Field>
              <Field label="Loaded CTN"><Input type="number" value={c.loaded_ctn} onChange={(e) => updateLhasa(i, { loaded_ctn: Number(e.target.value) })} /></Field>
              <Field label="Arrived at Nylam"><Input type="date" value={c.arrived_at_nylam || ""} onChange={(e) => updateLhasa(i, { arrived_at_nylam: e.target.value || null })} /></Field>
            </div>
          ))}
        </ContainersSection>

        {/* TATOPANI */}
        <ContainersSection
          title="TATOPANI"
          colorClass="text-warning"
          totalLabel="Total Containers"
          count={form.tatopani_total_containers ?? (form.tatopani_containers?.length || 0)}
          onCountChange={setTatCount}
        >
          {(form.tatopani_containers || []).map((c, i) => (
            <DestContainerCard key={i} index={i} c={c} statuses={TATOPANI_STATUSES} onChange={(p) => updateDest("tatopani_containers", i, p)} />
          ))}
        </ContainersSection>

        {/* KERUNG */}
        <ContainersSection
          title="KERUNG"
          colorClass="text-destructive"
          totalLabel="Total Containers"
          count={form.kerung_total_containers ?? (form.kerung_containers?.length || 0)}
          onCountChange={setKerCount}
        >
          {(form.kerung_containers || []).map((c, i) => (
            <DestContainerCard key={i} index={i} c={c} statuses={KERUNG_STATUSES} onChange={(p) => updateDest("kerung_containers", i, p)} />
          ))}
        </ContainersSection>

        <Field label="Remarks"><Textarea value={form.remarks || ""} onChange={(e) => setF("remarks", e.target.value)} /></Field>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(form)}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ContainersSection({ title, colorClass, totalLabel, count, onCountChange, children }: {
  title: string; colorClass: string; totalLabel: string; count: number; onCountChange: (n: number) => void; children: React.ReactNode;
}) {
  return (
    <div className="mt-4 rounded border border-border p-3 bg-card">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("font-bold text-sm", colorClass)}>▶ {title} ({count} containers)</div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{totalLabel}:</Label>
          <Input type="number" min={0} value={count} onChange={(e) => onCountChange(Math.max(0, Number(e.target.value)))} className="w-20 h-8" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function DestContainerCard({ index, c, statuses, onChange }: { index: number; c: DestContainer; statuses: string[]; onChange: (p: Partial<DestContainer>) => void }) {
  return (
    <div className="border border-border rounded p-3 bg-muted/30 space-y-2">
      <div className="font-semibold text-sm text-center">Container {index + 1}</div>
      <Field label="Dispatched from Nylam"><Input type="date" value={c.dispatched_from_nylam || ""} onChange={(e) => onChange({ dispatched_from_nylam: e.target.value || null })} /></Field>
      <Field label="Loaded CTN"><Input type="number" value={c.loaded_ctn} onChange={(e) => onChange({ loaded_ctn: Number(e.target.value) })} /></Field>
      <Field label="Nylam Container"><Input value={c.nylam_container} onChange={(e) => onChange({ nylam_container: e.target.value })} /></Field>
      <Field label="Status">
        <Select value={c.status} onValueChange={(v) => onChange({ status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </Field>
      <Field label="Received CTN"><Input type="number" value={c.received_ctn ?? ""} onChange={(e) => onChange({ received_ctn: e.target.value === "" ? null : Number(e.target.value) })} /></Field>
      <Field label="Arrival Date"><Input type="date" value={c.arrival_date || ""} onChange={(e) => onChange({ arrival_date: e.target.value || null })} /></Field>
    </div>
  );
}

// ---------- Master Edit ----------
function MasterEditDialog({ open, origin, ids, onClose, onDone }: {
  open: boolean; origin: Origin; ids: string[]; onClose: () => void; onDone: () => void;
}) {
  const [patch, setPatch] = useState<Partial<OverallDetail>>({});
  useEffect(() => { if (open) setPatch({}); }, [open]);
  const set = <K extends keyof OverallDetail>(k: K, v: any) => setPatch((s) => ({ ...s, [k]: v }));

  const apply = async () => {
    const cleaned: any = {};
    Object.entries(patch).forEach(([k, v]) => { if (v !== undefined && v !== "") cleaned[k] = v; });
    if (Object.keys(cleaned).length === 0) { toast.error("Nothing to update"); return; }
    try { await api.overallDetails.bulkUpdate(ids, cleaned); toast.success(`Updated ${ids.length} rows`); onDone(); }
    catch (e: any) { toast.error(e.message || "Update failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>Master Edit ({ids.length} items)</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="LOT No."><Input value={patch.lot_no || ""} onChange={(e) => set("lot_no", e.target.value)} /></Field>
          <Field label={`Dispatched from ${origin}`}><Input type="date" value={patch.dispatched_from_origin || ""} onChange={(e) => set("dispatched_from_origin", e.target.value)} /></Field>
          <Field label={`${origin} Container`}><Input value={patch.origin_container || ""} onChange={(e) => set("origin_container", e.target.value)} /></Field>
          <Field label="Arrival at Lhasa"><Input type="date" value={patch.arrival_at_lhasa || ""} onChange={(e) => set("arrival_at_lhasa", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={(patch.status as string) || ""} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue placeholder="(no change)" /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Destination">
            <Select value={patch.destination || ""} onValueChange={(v) => set("destination", v)}>
              <SelectTrigger><SelectValue placeholder="(no change)" /></SelectTrigger>
              <SelectContent>{DESTINATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply to {ids.length} rows</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Tatopani / Kerung bulk edit ----------
function DestBulkEditDialog({ open, kind, rows, onClose, onDone }: {
  open: boolean; kind: "TATOPANI" | "KERUNG"; rows: OverallDetail[]; onClose: () => void; onDone: () => void;
}) {
  const isTat = kind === "TATOPANI";
  const fieldKey = isTat ? "tatopani_containers" : "kerung_containers";
  const totalKey = isTat ? "tatopani_total_containers" : "kerung_total_containers";
  const statuses = isTat ? TATOPANI_STATUSES : KERUNG_STATUSES;
  const dispLabel = isTat ? "Dispatched from Nylam to Tatopani" : "Dispatched from Nylam to Kerung";
  const contLabel = isTat ? "Nylam Container for Tatopani" : "Nylam Container for Kerung";
  const arrLabel = isTat ? "Arrival Date at Tatopani" : "Arrival Date at Kerung";

  const [form, setForm] = useState<Partial<DestContainer>>({});
  useEffect(() => { if (open) setForm({ status: statuses[0] }); /* eslint-disable-next-line */ }, [open]);
  const set = <K extends keyof DestContainer>(k: K, v: any) => setForm((s) => ({ ...s, [k]: v }));

  const apply = async () => {
    if (!form.dispatched_from_nylam && !form.nylam_container && !form.status && !form.arrival_date) {
      toast.error("Fill at least one field"); return;
    }
    try {
      for (const r of rows) {
        const existing = (r[fieldKey] as DestContainer[]) || [];
        const newContainer: DestContainer = {
          ...makeDestContainer(),
          status: statuses[0],
          ...form,
        };
        const next = [...existing, newContainer];
        await api.overallDetails.update(r.id, { [fieldKey]: next, [totalKey]: next.length } as any);
      }
      toast.success(`Added ${kind} container to ${rows.length} rows`);
      onDone();
    } catch (e: any) { toast.error(e.message || "Failed"); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{kind} Edit ({rows.length} items)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Field label={dispLabel}><Input type="date" value={form.dispatched_from_nylam || ""} onChange={(e) => set("dispatched_from_nylam", e.target.value || null)} /></Field>
          <Field label={contLabel}><Input value={form.nylam_container || ""} onChange={(e) => set("nylam_container", e.target.value)} /></Field>
          <Field label="Status">
            <Select value={form.status || statuses[0]} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label={arrLabel}><Input type="date" value={form.arrival_date || ""} onChange={(e) => set("arrival_date", e.target.value || null)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={apply}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Page ----------
export default function OverallDetails() {
  const [tab, setTab] = useState<Origin>("Guangzhou");
  return (
    <div>
      <PageHeader title="Overall Details" breadcrumbs={[{ label: "Operations" }, { label: "Overall Details" }]} />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Origin)} className="w-full">
        <TabsList className="mx-6 mt-4">
          <TabsTrigger value="Guangzhou">Guangzhou</TabsTrigger>
          <TabsTrigger value="Yiwu">Yiwu</TabsTrigger>
        </TabsList>
        <TabsContent value="Guangzhou"><OriginTable origin="Guangzhou" /></TabsContent>
        <TabsContent value="Yiwu"><OriginTable origin="Yiwu" /></TabsContent>
      </Tabs>
    </div>
  );
}
