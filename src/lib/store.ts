import { supabase } from "@/integrations/supabase/client";

export type Station = { id: string; name: string; code: string; phone: string | null; location: string | null; cbm_rate: number; weight_rate: number; created_at: string; updated_at: string; };

export type Client = { id: string; name: string; phone: string | null; address: string | null; created_by: string | null; updated_by: string | null; created_at: string; updated_at: string; };

export type Consignment = {
  id: string; bill_no: string; marka: string; start_station: string; end_station: string;
  start_date: string; expected_delivery_date: string | null;
  client_name: string | null; client_phone: string | null;
  cbm: number; weight: number; quantity: number; ctn_no: string | null; cartoon: number;
  trade_mode: string | null; package_type: string | null; serial_prefix: string | null;
  description: string | null; remarks: string | null; image_url: string | null;
  packaging_fee: number; tax: number; freight: number; local_freight: number;
  insurance: number; bill_charge: number; loading_fee: number; payment_of_goods: number;
  goods_advance: number; unloading_fee: number; value_of_goods: number; payment_amount: number;
  calculation_factor: string; calculation_rate: number;
  sub_total: number; advance_amount: number; grand_total: number;
  status: string; payment_status: string | null; current_station: string | null;
  created_by: string | null; created_at: string; updated_at: string;
};

export type Shipment = {
  id: string; container_name: string; container_type: string | null; container_image_url: string | null;
  lot_no: string; driver_name: string | null; driver_phone: string | null;
  start_station: string; end_station: string; consignment_ids: string[];
  remarks: string | null; status: string;
  dispatched_by: string | null; arrival_approved_by: string | null; created_by: string | null;
  created_at: string; updated_at: string;
};

export type PaymentConsignmentDetail = { consignment_id: string; bill_no: string; bill_amount: number; discount: number; payment: number; };
export type Payment = {
  id: string; consignment_ids: string[]; amount: number; discount: number;
  paid_amount: number; sub_total: number; remaining_amount: number;
  receipt_url: string | null; status: string; verifier: string | null;
  initiated_by: string | null; remarks: string | null;
  consignment_details: PaymentConsignmentDetail[];
  created_at: string; updated_at: string;
};
export type LhasaContainer = {
  container_name: string;
  dispatched_from_lhasa: string | null; // YYYY-MM-DD
  loaded_ctn: number;
  arrived_at_nylam: string | null;
};
export type DestContainer = {
  dispatched_from_nylam: string | null;
  loaded_ctn: number;
  nylam_container: string;
  status: string; // On the way to X | At X port
  received_ctn: number | null;
  arrival_date: string | null;
};
export type OverallStatus =
  | "On the way to Lhasa" | "At Lhasa" | "On the way to Nylam" | "At Nylam"
  | "On the way to Tatopani" | "At Tatopani port" | "On the way to Kerung" | "At Kerung port"
  | "Tatopani Delivered" | "Kerung Delivered";

export type OverallDetail = {
  id: string;
  origin: "Guangzhou" | "Yiwu";
  date: string | null;
  consignment_no: string;
  marka: string | null;
  total_ctns: number;
  loaded_ctns: number;
  cbm: number;
  gw: number;
  destination: string | null;
  lot_no: string | null;
  dispatched_from_origin: string | null;
  origin_container: string | null;
  status: OverallStatus | string;
  arrival_at_lhasa: string | null;
  lhasa_containers: LhasaContainer[];
  lhasa_total_containers: number;
  nylam_arrival_dates: string[];
  received_ctns_at_nylam: number;
  tatopani_containers: DestContainer[];
  tatopani_total_containers: number;
  kerung_containers: DestContainer[];
  kerung_total_containers: number;
  client: string | null;
  remarks: string | null;
  multi_values: Record<string, string[]> | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryReceipt = {
  id: string; consignment_ids: string[];
  client_name: string; client_phone: string; client_email: string | null;
  receiver_name: string; receiver_phone: string; receiver_email: string | null;
  remarks: string | null; created_by: string | null;
  created_at: string; updated_at: string;
};

export const api = {
  stations: {
    list: async () => { const { data, error } = await supabase.from("stations").select("*").order("created_at", { ascending: false }); if (error) throw error; return data as Station[]; },
    create: async (s: Partial<Station>) => { const { data, error } = await supabase.from("stations").insert(s as any).select().single(); if (error) throw error; return data as Station; },
    update: async (id: string, s: Partial<Station>) => { const { data, error } = await supabase.from("stations").update(s as any).eq("id", id).select().single(); if (error) throw error; return data as Station; },
    remove: async (id: string) => { const { error } = await supabase.from("stations").delete().eq("id", id); if (error) throw error; },
  },
  consignments: {
    list: async () => { const { data, error } = await supabase.from("consignments").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data || []) as Consignment[]; },
    get: async (id: string) => { const { data, error } = await supabase.from("consignments").select("*").eq("id", id).single(); if (error) throw error; return data as Consignment; },
    create: async (c: Partial<Consignment>) => { const { data, error } = await supabase.from("consignments").insert(c as any).select().single(); if (error) throw error; return data as Consignment; },
    update: async (id: string, c: Partial<Consignment>) => { const { data, error } = await supabase.from("consignments").update(c as any).eq("id", id).select().single(); if (error) throw error; return data as Consignment; },
    remove: async (id: string) => { const { error } = await supabase.from("consignments").delete().eq("id", id); if (error) throw error; },
  },
  shipments: {
    list: async () => { const { data, error } = await supabase.from("shipments").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data || []).map((s: any) => ({ ...s, consignment_ids: s.consignment_ids || [] })) as Shipment[]; },
    create: async (s: Partial<Shipment>) => { const { data, error } = await supabase.from("shipments").insert(s as any).select().single(); if (error) throw error; return data as Shipment; },
    update: async (id: string, s: Partial<Shipment>) => { const { data, error } = await supabase.from("shipments").update(s as any).eq("id", id).select().single(); if (error) throw error; return data as Shipment; },
    remove: async (id: string) => { const { error } = await supabase.from("shipments").delete().eq("id", id); if (error) throw error; },
  },
  deliveryReceipts: {
    list: async () => { const { data, error } = await supabase.from("delivery_receipts").select("*").order("created_at", { ascending: false }); if (error) throw error; return ((data || []) as any[]).map((d) => ({ ...d, consignment_ids: d.consignment_ids || [] })) as DeliveryReceipt[]; },
    create: async (d: Partial<DeliveryReceipt>) => { const { data, error } = await supabase.from("delivery_receipts").insert(d as any).select().single(); if (error) throw error; return data as unknown as DeliveryReceipt; },
    update: async (id: string, d: Partial<DeliveryReceipt>) => { const { data, error } = await supabase.from("delivery_receipts").update(d as any).eq("id", id).select().single(); if (error) throw error; return data as unknown as DeliveryReceipt; },
    remove: async (id: string) => { const { error } = await supabase.from("delivery_receipts").delete().eq("id", id); if (error) throw error; },
  },
  clients: {
    list: async () => { const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false }); if (error) throw error; return (data || []) as Client[]; },
    create: async (c: Partial<Client>) => { const { data, error } = await supabase.from("clients").insert(c as any).select().single(); if (error) throw error; return data as Client; },
    update: async (id: string, c: Partial<Client>) => { const { data, error } = await supabase.from("clients").update(c as any).eq("id", id).select().single(); if (error) throw error; return data as Client; },
    remove: async (id: string) => { const { error } = await supabase.from("clients").delete().eq("id", id); if (error) throw error; },
  },
  payments: {
    list: async () => { const { data, error } = await supabase.from("payments").select("*").order("created_at", { ascending: false }); if (error) throw error; return ((data || []) as any[]).map((p) => ({ ...p, consignment_ids: p.consignment_ids || [], consignment_details: p.consignment_details || [] })) as Payment[]; },
    create: async (p: Partial<Payment>) => { const { data, error } = await supabase.from("payments").insert(p as any).select().single(); if (error) throw error; return data as unknown as Payment; },
    remove: async (id: string) => { const { error } = await supabase.from("payments").delete().eq("id", id); if (error) throw error; },
  },
  overallDetails: {
    list: async (origin: "Guangzhou" | "Yiwu") => {
      const { data, error } = await supabase.from("overall_details" as any).select("*").eq("origin", origin).order("created_at", { ascending: false });
      if (error) throw error;
      return ((data || []) as any[]).map((d) => ({
        ...d,
        lhasa_containers: d.lhasa_containers || [],
        nylam_arrival_dates: d.nylam_arrival_dates || [],
        tatopani_containers: d.tatopani_containers || [],
        kerung_containers: d.kerung_containers || [],
      })) as OverallDetail[];
    },
    create: async (d: Partial<OverallDetail>) => {
      const { data, error } = await supabase.from("overall_details" as any).insert(d as any).select().single();
      if (error) throw error;
      return data as unknown as OverallDetail;
    },
    update: async (id: string, d: Partial<OverallDetail>) => {
      const { data, error } = await supabase.from("overall_details" as any).update(d as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as OverallDetail;
    },
    bulkUpdate: async (ids: string[], patch: Partial<OverallDetail>) => {
      const { error } = await supabase.from("overall_details" as any).update(patch as any).in("id", ids);
      if (error) throw error;
    },
    remove: async (id: string) => { const { error } = await supabase.from("overall_details" as any).delete().eq("id", id); if (error) throw error; },
  },
};
