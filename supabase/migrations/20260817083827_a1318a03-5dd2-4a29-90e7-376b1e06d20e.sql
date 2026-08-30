
CREATE TYPE public.app_role AS ENUM ('administrator','procurement_manager','supply_chain_manager','vendor','finance_officer','auditor');
CREATE TYPE public.vendor_category AS ENUM ('raw_material','equipment','it','service','logistics','maintenance');
CREATE TYPE public.vendor_status AS ENUM ('active','inactive','pending','suspended');
CREATE TYPE public.po_status AS ENUM ('pending','approved','ordered','delivered','completed','cancelled');
CREATE TYPE public.delivery_status AS ENUM ('pending','shipped','in_transit','delivered','delayed','cancelled');
CREATE TYPE public.contract_status AS ENUM ('draft','active','expiring','expired','terminated');
CREATE TYPE public.invoice_status AS ENUM ('draft','submitted','approved','paid','overdue','disputed');

CREATE TABLE public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  category public.vendor_category NOT NULL DEFAULT 'service',
  status public.vendor_status NOT NULL DEFAULT 'pending',
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  city text,
  country text,
  website text,
  notes text,
  onboarded_at date NOT NULL DEFAULT current_date,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  email text,
  full_name text,
  job_title text,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL UNIQUE,
  category text NOT NULL,
  department text,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  status public.po_status NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  order_date date NOT NULL DEFAULT current_date,
  expected_delivery date,
  requested_by uuid,
  requester_name text,
  approved_by uuid,
  approved_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  description text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  status public.delivery_status NOT NULL DEFAULT 'pending',
  shipping_mode text,
  promised_date date,
  shipped_date date,
  delivered_date date,
  days_late integer NOT NULL DEFAULT 0,
  quantity_delivered integer NOT NULL DEFAULT 0,
  tracking_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  contract_number text NOT NULL UNIQUE,
  title text NOT NULL,
  status public.contract_status NOT NULL DEFAULT 'active',
  start_date date NOT NULL,
  end_date date NOT NULL,
  value numeric(14,2) NOT NULL DEFAULT 0,
  compliance_score integer NOT NULL DEFAULT 100,
  certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  document_path text,
  auto_renew boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'submitted',
  issued_date date NOT NULL DEFAULT current_date,
  due_date date,
  paid_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.quality_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  delivery_id uuid REFERENCES public.deliveries(id) ON DELETE SET NULL,
  inspected_at date NOT NULL DEFAULT current_date,
  quality_score integer NOT NULL DEFAULT 80,
  defect_count integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT true,
  inspector_name text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.communications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  thread_id uuid NOT NULL DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  body text NOT NULL,
  sender_id uuid,
  sender_name text,
  sender_type text NOT NULL DEFAULT 'buyer',
  response_time_hours numeric(8,2),
  resolution_time_hours numeric(8,2),
  attachment_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors, public.profiles, public.user_roles, public.products, public.purchase_orders, public.purchase_order_items, public.deliveries, public.contracts, public.invoices, public.quality_inspections, public.communications, public.notifications TO authenticated;
GRANT ALL ON public.vendors, public.profiles, public.user_roles, public.products, public.purchase_orders, public.purchase_order_items, public.deliveries, public.contracts, public.invoices, public.quality_inspections, public.communications, public.notifications TO service_role;

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role <> 'vendor')
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('administrator','procurement_manager','supply_chain_manager'))
$$;

CREATE OR REPLACE FUNCTION public.current_vendor_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT vendor_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_vendors_updated BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_po_updated BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_deliveries_updated BEFORE UPDATE ON public.deliveries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_contracts_updated BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_invoices_updated BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, job_title)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'job_title')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'procurement_manager'))
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'administrator') OR public.has_role(auth.uid(),'auditor'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'administrator'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'administrator'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "roles_select_own_or_admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'administrator'));
CREATE POLICY "roles_admin_write" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'administrator')) WITH CHECK (public.has_role(auth.uid(),'administrator'));

CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR id = public.current_vendor_id());
CREATE POLICY "vendors_manage" ON public.vendors FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE POLICY "vendors_update_own" ON public.vendors FOR UPDATE TO authenticated
  USING (id = public.current_vendor_id()) WITH CHECK (id = public.current_vendor_id());

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "products_manage" ON public.products FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "po_select" ON public.purchase_orders FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "po_manage" ON public.purchase_orders FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "po_items_select" ON public.purchase_order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.purchase_orders p WHERE p.id = purchase_order_id AND (public.is_staff(auth.uid()) OR p.vendor_id = public.current_vendor_id())));
CREATE POLICY "po_items_manage" ON public.purchase_order_items FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "deliveries_select" ON public.deliveries FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "deliveries_manage" ON public.deliveries FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "contracts_select" ON public.contracts FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "contracts_manage" ON public.contracts FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "invoices_select" ON public.invoices FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "invoices_manage" ON public.invoices FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()) OR public.has_role(auth.uid(),'finance_officer'))
  WITH CHECK (public.can_manage(auth.uid()) OR public.has_role(auth.uid(),'finance_officer'));

CREATE POLICY "qi_select" ON public.quality_inspections FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "qi_manage" ON public.quality_inspections FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE POLICY "comm_select" ON public.communications FOR SELECT TO authenticated
  USING (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());
CREATE POLICY "comm_insert" ON public.communications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()) OR vendor_id = public.current_vendor_id());

CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR vendor_id = public.current_vendor_id() OR (user_id IS NULL AND public.is_staff(auth.uid())));
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_staff(auth.uid())) WITH CHECK (true);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE INDEX idx_po_vendor ON public.purchase_orders(vendor_id);
CREATE INDEX idx_deliveries_vendor ON public.deliveries(vendor_id);
CREATE INDEX idx_invoices_vendor ON public.invoices(vendor_id);
CREATE INDEX idx_contracts_vendor ON public.contracts(vendor_id);
CREATE INDEX idx_qi_vendor ON public.quality_inspections(vendor_id);
CREATE INDEX idx_comm_vendor ON public.communications(vendor_id);
