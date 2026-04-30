ALTER TABLE public.user_permissions
  ADD COLUMN IF NOT EXISTS stations boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clients boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consignments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS shipments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_receipts boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS overall_details boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tracking_system boolean NOT NULL DEFAULT false;

-- Backfill: existing 'tracking' covers shipments + tracking_system; 'reports' = consignments;
-- 'billing' = payments; 'settings' = stations + clients + delivery_receipts + overall_details
UPDATE public.user_permissions SET
  shipments = COALESCE(shipments, false) OR COALESCE(tracking, false),
  tracking_system = COALESCE(tracking_system, false) OR COALESCE(tracking, false),
  consignments = COALESCE(consignments, false) OR COALESCE(reports, false),
  payments = COALESCE(payments, false) OR COALESCE(billing, false),
  stations = COALESCE(stations, false) OR COALESCE(settings, false),
  clients = COALESCE(clients, false) OR COALESCE(settings, false),
  delivery_receipts = COALESCE(delivery_receipts, false) OR COALESCE(settings, false),
  overall_details = COALESCE(overall_details, false) OR COALESCE(settings, false);