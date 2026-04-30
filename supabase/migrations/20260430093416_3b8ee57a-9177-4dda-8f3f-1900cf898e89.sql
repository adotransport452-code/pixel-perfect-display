-- Overall Details: single table for both Guangzhou and Yiwu pages, distinguished by origin
CREATE TABLE public.overall_details (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  origin TEXT NOT NULL CHECK (origin IN ('Guangzhou','Yiwu')),
  date DATE,
  consignment_no TEXT NOT NULL,
  marka TEXT,
  total_ctns NUMERIC DEFAULT 0,
  loaded_ctns NUMERIC DEFAULT 0,
  cbm NUMERIC DEFAULT 0,
  gw NUMERIC DEFAULT 0,
  destination TEXT, -- TATOPANI | KERUNG | TATOPANI-KERUNG | KERUNG-TATOPANI | NYLAM
  lot_no TEXT,
  dispatched_from_origin DATE,
  origin_container TEXT,
  status TEXT DEFAULT 'On the way to Lhasa',
  arrival_at_lhasa DATE,
  -- Lhasa expandable: array of { container_name, dispatched_from_lhasa, loaded_ctn, arrived_at_nylam }
  lhasa_containers JSONB DEFAULT '[]'::jsonb,
  lhasa_total_containers INTEGER DEFAULT 0,
  -- Nylam: multiple arrival dates
  nylam_arrival_dates JSONB DEFAULT '[]'::jsonb, -- array of date strings
  received_ctns_at_nylam NUMERIC DEFAULT 0,
  -- Tatopani expandable: array of { dispatched_from_nylam, loaded_ctn, nylam_container, status, received_ctn, arrival_date }
  tatopani_containers JSONB DEFAULT '[]'::jsonb,
  tatopani_total_containers INTEGER DEFAULT 0,
  -- Kerung expandable
  kerung_containers JSONB DEFAULT '[]'::jsonb,
  kerung_total_containers INTEGER DEFAULT 0,
  client TEXT,
  remarks TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_overall_details_origin ON public.overall_details(origin);
CREATE INDEX idx_overall_details_consignment_no ON public.overall_details(consignment_no);
CREATE INDEX idx_overall_details_lot_no ON public.overall_details(lot_no);

ALTER TABLE public.overall_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth full access overall_details"
ON public.overall_details
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER trg_overall_details_updated_at
BEFORE UPDATE ON public.overall_details
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();