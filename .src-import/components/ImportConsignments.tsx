import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { parseExcelFile, parsePastedTable } from "@/lib/excel";
import { api } from "@/lib/store";

/** Map of accepted header (lowercased) -> consignment column. */
const HEADER_MAP: Record<string, string> = {
  "bill no": "bill_no", "bill no.": "bill_no", "consignment no": "bill_no", "consignment no.": "bill_no", "billno": "bill_no",
  "brand": "marka", "marka": "marka",
  "ctn no": "ctn_no", "ctn no.": "ctn_no", "ctnno": "ctn_no", "track id": "ctn_no", "trackid": "ctn_no",
  "cbm": "cbm", "weight": "weight", "cartoon": "cartoon", "quantity": "quantity",
  "start station": "start_station", "from": "start_station",
  "end station": "end_station", "destination": "end_station", "to": "end_station",
  "current at": "current_station", "current station": "current_station",
  "start date": "start_date", "date": "start_date",
  "expected delivery date": "expected_delivery_date",
  "client": "client_name", "client name": "client_name",
  "phone": "client_phone", "client phone": "client_phone",
  "trade mode": "trade_mode", "package type": "package_type",
  "description": "description", "remarks": "remarks",
  "packaging fee": "packaging_fee", "tax": "tax",
  "freight": "freight", "local freight": "local_freight",
  "insurance": "insurance", "bill charge": "bill_charge",
  "loading fee": "loading_fee", "unloading fee": "unloading_fee",
  "value of goods": "value_of_goods", "payment of goods": "payment_of_goods",
  "goods advance": "goods_advance", "advance amount": "advance_amount",
  "payment amount": "payment_amount", "sub total": "sub_total",
  "grand total": "grand_total", "total": "grand_total",
  "status": "status", "payment status": "payment_status",
};

const NUMERIC_FIELDS = new Set([
  "cbm", "weight", "cartoon", "quantity", "packaging_fee", "tax", "freight", "local_freight",
  "insurance", "bill_charge", "loading_fee", "unloading_fee", "value_of_goods", "payment_of_goods",
  "goods_advance", "advance_amount", "payment_amount", "sub_total", "grand_total",
]);

function normalizeRow(raw: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const k of Object.keys(raw)) {
    const key = HEADER_MAP[k.toLowerCase().trim()];
    if (!key) continue;
    let v: any = raw[k];
    if (NUMERIC_FIELDS.has(key)) v = Number(String(v).replace(/[^\d.\-]/g, "")) || 0;
    if (key === "start_date" || key === "expected_delivery_date") {
      const d = new Date(String(v));
      v = !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
      if (key === "expected_delivery_date" && !v) v = null;
    }
    out[key] = v;
  }
  if (!out.start_date) out.start_date = new Date().toISOString().slice(0, 10);
  if (!out.marka) out.marka = "";
  if (!out.start_station) out.start_station = "";
  if (!out.end_station) out.end_station = "";
  return out;
}

export function ImportConsignments({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    try {
      const parsed = await parseExcelFile(file);
      setRows(parsed);
      toast.success(`Loaded ${parsed.length} rows`);
    } catch (e: any) { toast.error(e.message || "Failed to parse file"); }
  };

  const loadPasted = () => {
    try {
      const parsed = parsePastedTable(pasted);
      if (!parsed.length) return toast.error("No rows detected");
      setRows(parsed);
      toast.success(`Loaded ${parsed.length} rows`);
    } catch (e: any) { toast.error(e.message); }
  };

  const importAll = async () => {
    if (!rows.length) return toast.error("Nothing to import");
    setBusy(true);
    let ok = 0, fail = 0;
    for (const r of rows) {
      const payload = normalizeRow(r);
      if (!payload.bill_no) { fail++; continue; }
      try { await api.consignments.create(payload as any); ok++; } catch { fail++; }
    }
    setBusy(false);
    toast.success(`Imported ${ok}${fail ? `, ${fail} failed` : ""}`);
    onDone();
  };

  const previewKeys = rows[0] ? Object.keys(rows[0]).slice(0, 8) : [];

  return (
    <Tabs defaultValue="file" className="w-full">
      <TabsList>
        <TabsTrigger value="file">Upload Excel</TabsTrigger>
        <TabsTrigger value="paste">Paste Data</TabsTrigger>
      </TabsList>
      <TabsContent value="file" className="mt-4 space-y-3">
        <div>
          <Label className="mb-1.5 block text-sm">Excel/CSV file</Label>
          <Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
        </div>
      </TabsContent>
      <TabsContent value="paste" className="mt-4 space-y-3">
        <Label className="block text-sm">Paste rows from Excel/Google Sheets (first row should be headers)</Label>
        <Textarea rows={8} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder={"Bill No\tBrand\tCBM\tWeight\n1001\tACME\t1.2\t250"} />
        <Button variant="outline" onClick={loadPasted}>Parse Pasted Data</Button>
      </TabsContent>

      {rows.length > 0 && (
        <div className="mt-4 rounded-lg border border-border">
          <div className="bg-muted/50 px-3 py-2 text-sm font-semibold">Preview ({rows.length} rows)</div>
          <div className="max-h-64 overflow-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted">
                <tr>{previewKeys.map((k) => <th key={k} className="px-2 py-1 text-left font-medium">{k}</th>)}</tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    {previewKeys.map((k) => <td key={k} className="px-2 py-1">{String(r[k] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button onClick={importAll} disabled={busy || rows.length === 0} className="bg-gradient-primary text-primary-foreground">
          {busy ? "Importing…" : `Import ${rows.length || ""}`}
        </Button>
      </div>
    </Tabs>
  );
}