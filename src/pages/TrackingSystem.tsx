import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Package, MapPin, Truck, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { api, type OverallDetail } from "@/lib/store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function statusBadgeColor(status: string) {
  if (status?.includes("Tatopani")) return "bg-warning/15 text-warning border-warning/40";
  if (status?.includes("Kerung")) return "bg-destructive/15 text-destructive border-destructive/40";
  if (status?.includes("Nylam")) return "bg-primary/15 text-primary border-primary/40";
  if (status?.includes("Lhasa")) return "bg-purple-500/15 text-purple-600 border-purple-500/40";
  return "bg-muted text-muted-foreground border-border";
}

export default function TrackingSystem() {
  const [rows, setRows] = useState<OverallDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [g, y] = await Promise.all([api.overallDetails.list("Guangzhou"), api.overallDetails.list("Yiwu")]);
      setRows([...g, ...y]);
    } catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const trimmed = q.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!trimmed) return [];
    return rows.filter((r) =>
      [r.consignment_no, r.marka, r.lot_no, r.client, r.destination, r.origin_container, r.status]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(trimmed))
    );
  }, [rows, trimmed]);

  return (
    <div>
      <PageHeader title="Tracking System" breadcrumbs={[{ label: "Operations" }, { label: "Tracking System" }]} />
      <div className="px-6 py-4 space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search Consignment No., MARKA, LOT, client, container…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-8" />
        </div>

        {!trimmed ? (
          <div className="text-center py-20 text-muted-foreground border rounded-lg bg-muted/20">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <div className="text-base font-medium">Search to track a consignment</div>
            <div className="text-xs mt-1">Enter a Consignment No., MARKA, LOT, client or container above.</div>
          </div>
        ) : (
          <>
            <div className="text-sm text-muted-foreground">
              <Package className="inline h-4 w-4 mr-1" />
              Consignment Details ({filtered.length})
            </div>
            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Loading…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No consignments found</div>
            ) : (
              <div className="space-y-6">
                {filtered.map((r) => <TrackingCard key={r.id} r={r} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TrackingCard({ r }: { r: OverallDetail }) {
  const totalCtn = Number(r.total_ctns) || 0;
  const receivedNylam = Number(r.received_ctns_at_nylam) || 0;
  const loadedTat = (r.tatopani_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const loadedKer = (r.kerung_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const lastTat = (r.tatopani_containers || [])[(r.tatopani_containers || []).length - 1];
  const lastKer = (r.kerung_containers || [])[(r.kerung_containers || []).length - 1];
  const lastDest = lastKer || lastTat;
  const overallStatus = lastDest?.status || r.status;

  return (
    <Card className="overflow-hidden border border-border shadow-card">
      {/* Header */}
      <div className="bg-muted/40 border-b border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Consignment No." value={r.consignment_no} bold />
        <Field label="MARKA" value={r.marka || "—"} />
        <Field label="Total CTN" value={String(totalCtn)} />
        <Field label="Destination" value={r.destination || "—"} />
        <Field label="Client" value={r.client || "—"} />
        <Field label="Date" value={r.date || "—"} />
        <Field label="CBM" value={String(r.cbm || 0)} />
        <Field label="GW" value={String(r.gw || 0)} />
      </div>

      {/* Shipment Trail */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4" /> Shipment Trail</div>
          <span className={cn("inline-flex px-3 py-1 rounded-full text-xs font-medium border", statusBadgeColor(overallStatus))}>{overallStatus}</span>
        </div>
        <div className="overflow-x-auto">
          <div className="flex items-stretch gap-2 min-w-max">
            {/* Origin */}
            <TrailStep
              title={`Dispatched from ${r.origin}`}
              tone="success"
              done={!!r.dispatched_from_origin}
              lines={[
                r.dispatched_from_origin || "Pending",
                r.origin_container ? `Container: ${r.origin_container}` : "",
              ]}
            />
            <Arrow />
            {/* Lhasa containers */}
            {(r.lhasa_containers || []).length === 0 ? (
              <TrailStep title="Lhasa" tone="muted" lines={["Pending"]} />
            ) : (
              (r.lhasa_containers || []).map((c, i) => (
                <FragmentItem key={`l-${i}`}>
                  <TrailStep
                    title={`Lhasa Container ${i + 1}`}
                    tone="purple"
                    done={!!c.arrived_at_nylam}
                    lines={[
                      c.arrived_at_nylam ? `Arrived: ${c.arrived_at_nylam}` : "In transit",
                      c.container_name ? `Container: ${c.container_name}` : "",
                      c.dispatched_from_lhasa ? `Dispatched: ${c.dispatched_from_lhasa}` : "",
                      `Loaded: ${c.loaded_ctn} CTN`,
                    ]}
                  />
                  <Arrow />
                </FragmentItem>
              ))
            )}
            {/* Nylam */}
            <TrailStep
              title="At Nylam"
              tone="primary"
              done={receivedNylam > 0}
              lines={[
                receivedNylam > 0 ? `Received ${receivedNylam} CTN` : "Awaiting",
                ...(r.nylam_arrival_dates || []).filter(Boolean).map((d) => `📅 ${d}`),
              ]}
            />
            {/* Tatopani / Kerung */}
            {(r.tatopani_containers || []).map((c, i) => (
              <FragmentItem key={`t-${i}`}>
                <Arrow />
                <TrailStep
                  title={`Tatopani Container ${i + 1}`}
                  tone="warning"
                  done={c.status === "At Tatopani port"}
                  lines={[
                    c.status,
                    c.arrival_date ? `📅 ${c.arrival_date}` : "",
                    c.nylam_container ? `${c.nylam_container} | Loaded: ${c.loaded_ctn} | Received: ${c.received_ctn ?? "—"}` : "",
                  ]}
                />
              </FragmentItem>
            ))}
            {(r.kerung_containers || []).map((c, i) => (
              <FragmentItem key={`k-${i}`}>
                <Arrow />
                <TrailStep
                  title={`Kerung Container ${i + 1}`}
                  tone="destructive"
                  done={c.status === "At Kerung port"}
                  lines={[
                    c.status,
                    c.arrival_date ? `📅 ${c.arrival_date}` : "",
                    c.nylam_container ? `${c.nylam_container} | Loaded: ${c.loaded_ctn} | Received: ${c.received_ctn ?? "—"}` : "",
                  ]}
                />
              </FragmentItem>
            ))}
          </div>
        </div>
      </div>

      {/* LHASA Details */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-purple-600"><AlertTriangle className="h-4 w-4" /> LHASA Details</div>
        <div className="rounded border border-border p-3 bg-muted/20 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-warning/15 text-warning text-xs font-medium">Arrival at Lhasa: {r.arrival_at_lhasa || "—"}</span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-warning/15 text-warning text-xs font-medium">
              Remaining CTN at Lhasa: {receivedNylam > 0 ? (r.lhasa_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0) - receivedNylam : "—"}
            </span>
          </div>
          {(r.lhasa_containers || []).map((c, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-2 px-2 py-1.5 rounded bg-card border border-border/60 text-xs">
              <div><b>Container {i + 1}:</b> {c.container_name || "—"}</div>
              <div><b>Dispatched:</b> {c.dispatched_from_lhasa || "—"}</div>
              <div><b>Loaded CTN:</b> {c.loaded_ctn}</div>
            </div>
          ))}
          {(r.lhasa_containers || []).length === 0 && <div className="text-muted-foreground text-xs">No Lhasa containers yet</div>}
        </div>
      </div>

      {/* TATOPANI */}
      {(r.tatopani_containers || []).length > 0 && (
        <DestSection title="TATOPANI" tone="warning" containers={r.tatopani_containers} />
      )}
      {/* KERUNG */}
      {(r.kerung_containers || []).length > 0 && (
        <DestSection title="KERUNG" tone="destructive" containers={r.kerung_containers} />
      )}

      {/* Footer summary */}
      <div className="bg-muted/40 border-t border-border p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Total CTN" value={String(totalCtn)} bold />
        <Field label="Received at Nylam" value={String(receivedNylam || "—")} />
        <Field label="Loaded Tatopani" value={String(loadedTat || "—")} />
        <Field label="Loaded Kerung" value={String(loadedKer || "—")} />
      </div>
    </Card>
  );
}

function Field({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm mt-0.5", bold && "font-bold")}>{value}</div>
    </div>
  );
}

function Arrow() {
  return <div className="self-center text-muted-foreground px-1">→</div>;
}

function FragmentItem({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function TrailStep({ title, tone, done, lines }: {
  title: string; tone: "success" | "purple" | "primary" | "warning" | "destructive" | "muted"; done?: boolean; lines: string[];
}) {
  const tones: Record<string, string> = {
    success: "bg-success/10 border-success/40 text-success-foreground",
    purple: "bg-purple-500/10 border-purple-500/40",
    primary: "bg-primary/10 border-primary/40",
    warning: "bg-warning/10 border-warning/40",
    destructive: "bg-destructive/10 border-destructive/40",
    muted: "bg-muted border-border",
  };
  const head: Record<string, string> = {
    success: "text-success", purple: "text-purple-600", primary: "text-primary",
    warning: "text-warning", destructive: "text-destructive", muted: "text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg border-2 p-3 min-w-[180px] max-w-[220px]", tones[tone])}>
      <div className={cn("text-xs font-bold mb-1 flex items-center gap-1", head[tone])}>
        {done && <CheckCircle2 className="h-3 w-3" />} {title}
      </div>
      {lines.filter(Boolean).map((l, i) => <div key={i} className="text-[11px] text-foreground/80 leading-tight">{l}</div>)}
    </div>
  );
}

function DestSection({ title, tone, containers }: { title: string; tone: "warning" | "destructive"; containers: any[] }) {
  const color = tone === "warning" ? "text-warning" : "text-destructive";
  return (
    <div className="p-4 border-b border-border">
      <div className={cn("flex items-center gap-2 text-sm font-semibold mb-2", color)}>
        <AlertTriangle className="h-4 w-4" /> {title} ({containers.length} container{containers.length !== 1 ? "s" : ""})
      </div>
      <div className="rounded border border-border bg-muted/20">
        {containers.map((c, i) => (
          <div key={i} className="grid grid-cols-2 gap-y-1 text-sm p-3 border-b border-border/40 last:border-b-0">
            <div className="text-muted-foreground">Container:</div><div className="text-right font-medium">{c.nylam_container || "—"}</div>
            <div className="text-muted-foreground">Dispatched:</div><div className="text-right">{c.dispatched_from_nylam || "—"}</div>
            <div className="text-muted-foreground">Loaded CTN:</div><div className="text-right text-primary font-semibold">{c.loaded_ctn}</div>
            <div className="text-muted-foreground">Received CTN:</div><div className="text-right text-primary font-semibold">{c.received_ctn ?? "—"}</div>
            <div className="text-muted-foreground">Status:</div><div className={cn("text-right font-medium", color)}>{c.status}</div>
            <div className="text-muted-foreground">Arrival Date:</div><div className="text-right inline-flex items-center justify-end gap-1"><Calendar className="h-3 w-3" /> {c.arrival_date || "—"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
