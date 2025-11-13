export interface PortalCustomer {
  name: string;
  customer_name?: string;
  customer_type?: string;
  phone?: string;
  email?: string;
  branch?: string;
  preferred_contact_method?: string;
  is_vip?: number | boolean;
}

export interface PortalVehicle {
  name: string;
  customer?: string;
  license_plate?: string;
  brand?: string;
  type_model?: string;
  model?: string;
  model_variant?: string;
  vehicle_year?: string;
  color?: string;
  transmission?: string;
  fuel_type?: string;
  mileage?: number;
  engine_number?: string;
  last_service_date?: string;
  branch?: string;
}

export interface PortalServiceOrder {
  name: string;
  status?: string;
  customer?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  vehicle?: string;
  vehicle_plate?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_year?: string;
  branch?: string;
  branch_code?: string;
  priority?: string;
  service_order_type?: string;
  service_notes?: string;
  inspection_summary?: string;
  job_card_status?: string;
  work_order_status?: string;
  qc_status?: string;
  part_charge_status?: string;
  service_booking_date?: string;
  estimated_delivery_date?: string;
  actual_delivery_date?: string;
  total_estimated_amount?: number;
  total_approved_amount?: number;
  booking_channel?: string;
  booking_reference?: string;
  intake_type?: string;
  hours_until_booking?: number;
  booking_window?: string;
}

export interface PortalSpareOrder {
  name: string;
  status?: string;
  customer?: string;
  branch?: string;
  branch_code?: string;
  order_date?: string;
  delivery_date?: string;
  total_amount?: number;
}

export interface PortalSparePart {
  name: string;
  part_code?: string;
  part_name?: string;
  description?: string;
  category?: string;
  brand?: string;
  uom?: string;
  unit_price?: number;
  stock_qty?: number;
  reserved_qty?: number;
  reorder_level?: number;
  warehouse_location?: string;
  managed_by?: string;
  status?: string;
  last_restocked_on?: string;
  branch?: string;
  default_warehouse?: string;
  warehouse?: string;
}

export interface PortalSparePartTechnician {
  technician?: string;
  technician_name?: string;
  task?: string;
  status?: string;
}

export interface PortalSparePartRequest {
  name: string;
  parent?: string;
  idx?: number;
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  rate?: number;
  amount?: number;
  stock_status?: string;
  warehouse?: string;
  source?: string;
  technicians?: PortalSparePartTechnician[];
  customer?: string;
  vehicle?: string;
  service_advisor?: string;
  part_charge_status?: string;
}

export interface PortalSparePartApproval {
  name: string;
  parent?: string;
  approved_on?: string;
  status?: string;
  approver?: string;
}

export interface PortalProcurementOrder {
  name: string;
  status?: string;
  supplier?: string;
  order_date?: string;
  expected_date?: string;
  total_qty?: number;
  total_amount?: number;
}

export interface PortalStockMovement {
  name: string;
  movement_type?: string;
  reference_type?: string;
  reference_name?: string;
  posting_date?: string;
  warehouse?: string;
  status?: string;
}

export interface PortalSalesInvoice {
  name: string;
  status?: string;
  customer?: string;
  branch?: string;
  branch_code?: string;
  invoice_date?: string;
  due_date?: string;
  total_amount?: number;
  outstanding_amount?: number;
}

export interface PortalPaymentEntry {
  name: string;
  status?: string;
  customer?: string;
  branch?: string;
  branch_code?: string;
  payment_date?: string;
  mode_of_payment?: string;
  paid_amount?: number;
}

export interface PortalReceiptDocument {
  name: string;
  payment_entry?: string;
  branch?: string;
  branch_code?: string;
  receipt_date?: string;
  receipt_number?: string;
  delivery_method?: string;
}

export interface PortalServiceBundleRow {
  item_code?: string;
  item_name?: string;
  description?: string;
  qty?: number;
  uom?: string;
  rate?: number;
}

export interface PortalServiceBundle {
  name: string;
  bundle_name?: string;
  bundle_type?: string;
  grand_total?: number;
  spare_parts?: PortalServiceBundleRow[];
  materials?: PortalServiceBundleRow[];
}

export interface PortalStatusSummary {
  service_orders?: Record<string, number>;
  spare_orders?: Record<string, number>;
  procurement_orders?: Record<string, number>;
  stock_movements?: Record<string, number>;
  sales_invoices?: Record<string, number>;
  payment_entries?: Record<string, number>;
}

export interface PortalTotals {
  invoice_total?: number;
  outstanding_total?: number;
  payments_total?: number;
}

export interface PortalBranch {
  name: string;
  branch_name?: string;
  branch_code?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  phone?: string;
  email?: string;
}

export interface PortalBootstrap {
  customers: PortalCustomer[];
  vehicles: PortalVehicle[];
  service_orders: PortalServiceOrder[];
  open_service_orders: PortalServiceOrder[];
  spare_orders: PortalSpareOrder[];
  open_spare_orders: PortalSpareOrder[];
  spare_parts: PortalSparePart[];
  service_bundles: PortalServiceBundle[];
  spare_part_requests: PortalSparePartRequest[];
  spare_part_approvals: PortalSparePartApproval[];
  procurement_orders: PortalProcurementOrder[];
  pending_procurement: PortalProcurementOrder[];
  stock_movements: PortalStockMovement[];
  sales_invoices: PortalSalesInvoice[];
  open_invoices: PortalSalesInvoice[];
  payment_entries: PortalPaymentEntry[];
  receipt_documents: PortalReceiptDocument[];
  branches: PortalBranch[];
  active_branch?: string;
  active_filters?: {
    mode?: string;
    start_date?: string;
    end_date?: string;
    value?: string;
  };
  status_summary?: PortalStatusSummary;
  totals?: PortalTotals;
  refreshed_at?: string;
}

export interface PortalNavigationItem {
  route: string;
  key: string;
  label: string;
  roles?: string[];
  allowed?: boolean;
}

export interface PortalBootstrapFilters {
  branch?: string;
  start_date?: string;
  end_date?: string;
  date_filter_mode?: string;
  date_filter_value?: string;
}

export interface PortalUserProfile {
  id: string;
  fullName: string;
  email: string;
}
