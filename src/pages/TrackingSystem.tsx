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
  const loadedCtns = Number(r.loaded_ctns) || 0;
  const receivedNylam = Number(r.received_ctns_at_nylam) || 0;
  const loadedLhasa = (r.lhasa_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const loadedTat = (r.tatopani_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const receivedTat = (r.tatopani_containers || []).reduce((s, c) => s + (Number(c.received_ctn) || 0), 0);
  const loadedKer = (r.kerung_containers || []).reduce((s, c) => s + (Number(c.loaded_ctn) || 0), 0);
  const receivedKer = (r.kerung_containers || []).reduce((s, c) => s + (Number(c.received_ctn) || 0), 0);

  // Status comes from Overall Details "status" field directly
  const overallStatus = r.status || "Pending";

  // Calculations matching OverallDetails (return null when not yet applicable)
  const remOrigin = (() => {
    if (!loadedCtns) return null;
    return Math.max(0, totalCtn - loadedCtns);
  })();
  const remLhasa = (() => {
    if (!receivedNylam) return null;
    return loadedLhasa - receivedNylam;
  })();
  const remNylam = (() => {
    if (loadedTat <= 0 && loadedKer <= 0) return null;
    return receivedNylam - loadedTat - loadedKer;
  })();
  const onWay = (() => {
    let total = 0; let any = false;
    for (const c of r.tatopani_containers || []) if (c.status === "On the way to Tatopani") { total += Number(c.loaded_ctn) || 0; any = true; }
    for (const c of r.kerung_containers || []) if (c.status === "On the way to Kerung") { total += Number(c.loaded_ctn) || 0; any = true; }
    return any ? total : null;
  })();
  const missing = (() => {
    let total = 0; let any = false;
    for (const c of r.tatopani_containers || []) if (c.status === "At Tatopani port" && c.received_ctn != null) { total += (Number(c.loaded_ctn) || 0) - Number(c.received_ctn); any = true; }
    for (const c of r.kerung_containers || []) if (c.status === "At Kerung port" && c.received_ctn != null) { total += (Number(c.loaded_ctn) || 0) - Number(c.received_ctn); any = true; }
    return any ? total : null;
  })();

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
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold"><Truck className="h-4 w-4" /> Shipment Trail</div>
          <span className={cn("inline-flex px-5 py-2 rounded-full text-base md:text-lg font-bold border-2", statusBadgeColor(overallStatus))}>{overallStatus}</span>
        </div>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <div className="text-xs font-bold mb-2">{r.consignment_no} • {r.marka || "—"}</div>
          <div className="text-xs text-muted-foreground mb-3">{r.origin} → {r.destination || "—"}</div>
          <div className="overflow-x-auto">
            <div className="flex items-stretch gap-2 min-w-max">
              {/* Origin */}
              <TrailStep
                title={`Dispatched from ${r.origin}`}
                tone="success"
                done={!!r.dispatched_from_origin}
                badge={r.dispatched_from_origin ? "✓ Done" : "Pending"}
                lines={[
                  r.dispatched_from_origin ? `📅 ${r.dispatched_from_origin}` : "",
                  r.origin_container ? `Container: ${r.origin_container}` : "",
                  loadedCtns > 0 ? `Loaded: ${loadedCtns} CTN` : "",
                ]}
              />
              <Arrow />

              {/* Lhasa Arrived (only when arrival_at_lhasa is filled) */}
              {r.arrival_at_lhasa ? (
                <>
                  <TrailStep
                    title="Lhasa Arrived"
                    tone="purple"
                    done
                    badge={`✓ Arrived`}
                    lines={[`📅 ${r.arrival_at_lhasa}`]}
                  />
                  <Arrow />
                </>
              ) : (
                <>
                  <TrailStep title="Lhasa" tone="muted" badge="Awaiting" lines={[]} />
                  <Arrow />
                </>
              )}

              {/* Lhasa containers — only those actually loaded/dispatched */}
              {(r.lhasa_containers || [])
                .filter((c) => c.container_name || c.dispatched_from_lhasa || c.loaded_ctn)
                .map((c, i) => (
                  <FragmentItem key={`l-${i}`}>
                    <TrailStep
                      title={`Lhasa Container ${i + 1}`}
                      tone="purple"
                      done={!!c.dispatched_from_lhasa}
                      badge={c.dispatched_from_lhasa ? "✓ Dispatched" : "Loading"}
                      lines={[
                        c.container_name ? `Container: ${c.container_name}` : "",
                        c.dispatched_from_lhasa ? `📅 Dispatched: ${c.dispatched_from_lhasa}` : "",
                        c.loaded_ctn ? `Loaded: ${c.loaded_ctn} CTN` : "",
                        c.arrived_at_nylam ? `Arrived Nylam: ${c.arrived_at_nylam}` : "",
                      ]}
                    />
                    <Arrow />
                  </FragmentItem>
                ))}

              {/* Nylam — Awaiting if no nylam_arrival_dates, else Received */}
              {(() => {
                const dates = (r.nylam_arrival_dates || []).filter(Boolean);
                const hasArrived = dates.length > 0 || receivedNylam > 0;
                return (
                  <TrailStep
                    title="At Nylam"
                    tone={hasArrived ? "primary" : "muted"}
                    done={hasArrived}
                    badge={hasArrived ? `Received ${receivedNylam || 0} CTN` : "Awaiting"}
                    lines={dates.map((d) => `📅 ${d}`)}
                  />
                );
              })()}

              {/* Tatopani */}
              {(r.tatopani_containers || []).map((c, i) => (
                <FragmentItem key={`t-${i}`}>
                  <Arrow />
                  <TrailStep
                    title={`Tatopani Container ${i + 1}`}
                    tone="warning"
                    done={c.status === "At Tatopani port"}
                    badge={c.status}
                    lines={[
                      c.arrival_date ? `📅 ${c.arrival_date}` : "",
                      c.nylam_container || "",
                      c.loaded_ctn != null ? `Loaded: ${c.loaded_ctn}` : "",
                      c.received_ctn != null ? `Received: ${c.received_ctn}` : "",
                    ]}
                  />
                </FragmentItem>
              ))}
              {/* Kerung */}
              {(r.kerung_containers || []).map((c, i) => (
                <FragmentItem key={`k-${i}`}>
                  <Arrow />
                  <TrailStep
                    title={`Kerung Container ${i + 1}`}
                    tone="destructive"
                    done={c.status === "At Kerung port"}
                    badge={c.status}
                    lines={[
                      c.arrival_date ? `📅 ${c.arrival_date}` : "",
                      c.nylam_container || "",
                      c.loaded_ctn != null ? `Loaded: ${c.loaded_ctn}` : "",
                      c.received_ctn != null ? `Received: ${c.received_ctn}` : "",
                    ]}
                  />
                </FragmentItem>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTN Summary */}
      <div className="p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Package className="h-4 w-4" /> CTN Flow Summary</div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <Stat label={`Loaded at ${r.origin}`} value={loadedCtns || "—"} />
          <Stat label="Loaded at Lhasa" value={loadedLhasa || "—"} tone="purple" />
          <Stat label="Received at Nylam" value={receivedNylam || "—"} tone="primary" />
          {(r.tatopani_containers || []).length > 0 && (
            <Stat label="Tatopani (L / R)" value={`${loadedTat} / ${receivedTat}`} tone="warning" />
          )}
          {(r.kerung_containers || []).length > 0 && (
            <Stat label="Kerung (L / R)" value={`${loadedKer} / ${receivedKer}`} tone="destructive" />
          )}
        </div>
      </div>

      {/* LHASA Details */}
      {(r.lhasa_containers || []).length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-purple-600"><AlertTriangle className="h-4 w-4" /> LHASA Details</div>
          <div className="rounded border border-border p-3 bg-muted/20 space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              {r.arrival_at_lhasa && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-purple-500/15 text-purple-600 text-xs font-medium">Arrival at Lhasa: {r.arrival_at_lhasa}</span>
              )}
              {receivedNylam > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-warning/15 text-warning text-xs font-medium">
                  Remaining CTN at Lhasa: {loadedLhasa - receivedNylam}
                </span>
              )}
            </div>
            {(r.lhasa_containers || []).map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 px-2 py-1.5 rounded bg-card border border-border/60 text-xs">
                <div><b>Container {i + 1}:</b> {c.container_name || "—"}</div>
                <div><b>Dispatched:</b> {c.dispatched_from_lhasa || "—"}</div>
                <div><b>Loaded CTN:</b> {c.loaded_ctn || "—"}</div>
                <div><b>Arrived Nylam:</b> {c.arrived_at_nylam || "—"}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TATOPANI */}
      {(r.tatopani_containers || []).length > 0 && (
        <DestSection title="TATOPANI" tone="warning" containers={r.tatopani_containers} />
      )}
      {/* KERUNG */}
      {(r.kerung_containers || []).length > 0 && (
        <DestSection title="KERUNG" tone="destructive" containers={r.kerung_containers} />
      )}
    </Card>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: React.ReactNode; tone?: "default" | "purple" | "primary" | "warning" | "destructive" }) {
  const tones: Record<string, string> = {
    default: "bg-card border-border",
    purple: "bg-purple-500/10 border-purple-500/40 text-purple-700",
    primary: "bg-primary/10 border-primary/40 text-primary",
    warning: "bg-warning/10 border-warning/40 text-warning",
    destructive: "bg-destructive/10 border-destructive/40 text-destructive",
  };
  return (
    <div className={cn("rounded border-2 p-2", tones[tone])}>
      <div className="text-[10px] uppercase tracking-wide opacity-80 font-semibold">{label}</div>
      <div className="text-sm font-extrabold mt-0.5">{value}</div>
    </div>
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

function TrailStep({ title, tone, done, lines, badge }: {
  title: string; tone: "success" | "purple" | "primary" | "warning" | "destructive" | "muted"; done?: boolean; lines: string[]; badge?: string;
}) {
  const tones: Record<string, string> = {
    success: "bg-success/10 border-success/40",
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
  const badgeBg: Record<string, string> = {
    success: "bg-success/20 text-success", purple: "bg-purple-500/20 text-purple-700",
    primary: "bg-primary/20 text-primary", warning: "bg-warning/20 text-warning",
    destructive: "bg-destructive/20 text-destructive", muted: "bg-muted text-muted-foreground",
  };
  return (
    <div className={cn("rounded-lg border-2 p-3 min-w-[180px] max-w-[230px] flex flex-col items-center text-center", tones[tone])}>
      <div className={cn("text-xs font-bold mb-2", head[tone])}>{title}</div>
      {badge && (
        <div className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-md text-sm font-bold mb-2", badgeBg[tone])}>
          {done && <CheckCircle2 className="h-3.5 w-3.5" />} {badge}
        </div>
      )}
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
