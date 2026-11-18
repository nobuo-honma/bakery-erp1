export type LotRuleType = 'NORMAL' | 'NO_DAY_00' | 'ASSORT_MANUAL';

export interface Product {
  product_id: string;
  product_name: string;
  flavor_name: string;
  pieces_per_kg: number;
  pieces_per_cs: number;
  pieces_per_pack: number;
  is_assort: number;
  assort_flavors?: string | null;
  lot_rule_type: LotRuleType;
  is_active: number;
}

export interface Item {
  item_id: string;
  item_name: string;
  category: 'raw_material' | 'material';
  spec_qty: number;
  unit: string;
  unit_price: number;
  safety_stock: number;
  supplier_name: string;
  maker_name: string;
  current_stock: number;
}

export interface Customer {
  customer_id: number;
  customer_name: string;
  postal_code: string;
  address: string;
  contact_info: string;
  contact_person: string;
}

export interface OrderDetail {
  detail_id: number;
  order_id: number;
  product_id: string;
  order_cs: number;
  product_name?: string;
  flavor_name?: string;
  pieces_per_cs?: number;
  pieces_per_pack?: number;
}

export interface Order {
  order_id: number;
  order_no: string;
  customer_id: number;
  customer_name?: string;
  order_date: string;
  scheduled_ship_date: string;
  delivery_date: string;
  status: 'UNPLANNED' | 'PLANNED' | 'IN_PROGRESS' | 'SHIPPED';
  notes: string;
  details: OrderDetail[];
}

export interface ProductionPlan {
  plan_id: number;
  plan_date: string;
  product_id: string;
  sub_flavor: string;
  planned_qty_pieces: number;
  planned_base_kg: number;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  event_title: string;
  product_name?: string;
  flavor_name?: string;
  pieces_per_cs?: number;
}

export interface ProductLot {
  lot_number: string;
  product_id: string;
  manufacture_date: string;
  manufactured_cs: number;
  current_stock_cs: number;
  product_name?: string;
  flavor_name?: string;
}

export interface InventoryLog {
  log_id: number;
  target_type: 'ITEM' | 'PRODUCT';
  target_id: string;
  change_qty: number;
  reason: string;
  created_at: string;
}

export interface UnplannedRequirementResult {
  unplannedDetails: Array<{
    detail_id: number;
    order_id: number;
    product_id: string;
    order_cs: number;
    order_no: string;
    scheduled_ship_date: string;
    product_name: string;
    flavor_name: string;
    pieces_per_kg: number;
    pieces_per_cs: number;
  }>;
  allBom: Array<{
    product_id: string;
    item_id: string;
    usage_rate: number;
    calc_basis: 'production_qty' | 'order_qty';
  }>;
  allItems: Item[];
}