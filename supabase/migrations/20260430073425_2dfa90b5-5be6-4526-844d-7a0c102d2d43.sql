
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'client');

-- Updated_at trigger fn
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  email text NOT NULL,
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_permissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dashboard boolean NOT NULL DEFAULT true,
  tracking boolean NOT NULL DEFAULT false,
  reports boolean NOT NULL DEFAULT false,
  billing boolean NOT NULL DEFAULT false,
  settings boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert profiles" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile, admins all" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete profiles" ON public.profiles
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own permissions" ON public.user_permissions
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage permissions" ON public.user_permissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_permissions (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER user_permissions_touch BEFORE UPDATE ON public.user_permissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Domain tables
CREATE TABLE public.stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  phone TEXT,
  location TEXT,
  cbm_rate NUMERIC DEFAULT 0,
  weight_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.consignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_no TEXT NOT NULL, marka TEXT NOT NULL,
  start_station TEXT NOT NULL, end_station TEXT NOT NULL,
  start_date DATE NOT NULL, expected_delivery_date DATE,
  client_name TEXT, client_phone TEXT,
  cbm NUMERIC DEFAULT 0, weight NUMERIC DEFAULT 0, quantity NUMERIC DEFAULT 0,
  ctn_no TEXT, cartoon NUMERIC DEFAULT 0,
  trade_mode TEXT, package_type TEXT, serial_prefix TEXT,
  description TEXT, remarks TEXT, image_url TEXT,
  packaging_fee NUMERIC DEFAULT 0, tax NUMERIC DEFAULT 0, freight NUMERIC DEFAULT 0,
  local_freight NUMERIC DEFAULT 0, insurance NUMERIC DEFAULT 0,
  bill_charge NUMERIC DEFAULT 10, loading_fee NUMERIC DEFAULT 0,
  payment_of_goods NUMERIC DEFAULT 0, goods_advance NUMERIC DEFAULT 0,
  unloading_fee NUMERIC DEFAULT 0, value_of_goods NUMERIC DEFAULT 0,
  payment_amount NUMERIC DEFAULT 0,
  calculation_factor TEXT DEFAULT 'CBM', calculation_rate NUMERIC DEFAULT 0,
  sub_total NUMERIC DEFAULT 0, advance_amount NUMERIC DEFAULT 0, grand_total NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending', payment_status TEXT DEFAULT 'Unpaid',
  current_station TEXT, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_name TEXT NOT NULL, container_type TEXT, container_image_url TEXT,
  lot_no TEXT NOT NULL,
  driver_name TEXT, driver_phone TEXT,
  start_station TEXT NOT NULL, end_station TEXT NOT NULL,
  consignment_ids JSONB DEFAULT '[]'::jsonb,
  remarks TEXT, status TEXT DEFAULT 'In Transit',
  dispatched_by TEXT, arrival_approved_by TEXT, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.delivery_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_ids JSONB DEFAULT '[]'::jsonb,
  client_name TEXT NOT NULL, client_phone TEXT NOT NULL, client_email TEXT,
  receiver_name TEXT NOT NULL, receiver_phone TEXT NOT NULL, receiver_email TEXT,
  remarks TEXT, created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consignment_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  amount NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  sub_total NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'Approved',
  verifier TEXT, initiated_by TEXT, remarks TEXT,
  consignment_details JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read & write logistics data
CREATE POLICY "Auth full access stations" ON public.stations FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access clients" ON public.clients FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access consignments" ON public.consignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access shipments" ON public.shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access delivery_receipts" ON public.delivery_receipts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Auth full access payments" ON public.payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_stations_updated BEFORE UPDATE ON public.stations FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_consignments_updated BEFORE UPDATE ON public.consignments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_shipments_updated BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_delivery_receipts_updated BEFORE UPDATE ON public.delivery_receipts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('container-images', 'container-images', true)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Container images public read" ON storage.objects FOR SELECT USING (bucket_id = 'container-images');
CREATE POLICY "Container images auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'container-images');
CREATE POLICY "Container images auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'container-images');
CREATE POLICY "Container images auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'container-images');

CREATE POLICY "Payment receipts public read" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts');
CREATE POLICY "Payment receipts auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment-receipts');
CREATE POLICY "Payment receipts auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'payment-receipts');
CREATE POLICY "Payment receipts auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'payment-receipts');
