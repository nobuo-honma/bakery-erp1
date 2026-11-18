import { Product, Customer, Order, Item, ProductionPlan, ProductLot, InventoryLog, UnplannedRequirementResult } from '@/types';

declare global {
  interface Window {
    api?: {
      getProducts: () => Promise<Product[]>;
      importProducts: (products: unknown[]) => Promise<{ success: boolean; count: number }>;
      getItems: () => Promise<Item[]>;
      importItems: (items: unknown[]) => Promise<{ success: boolean; count: number }>;
      getCustomers: () => Promise<Customer[]>;
      createCustomer: (customer: Omit<Customer, 'customer_id'>) => Promise<{ success: boolean; customer_id: number }>;
      importCustomers: (customers: unknown[]) => Promise<{ success: boolean; count: number }>;
      getOrders: () => Promise<Order[]>;
      createOrder: (orderInput: unknown) => Promise<{ success: boolean; order_id: number }>;
      getUnplannedRequirements: () => Promise<UnplannedRequirementResult>;
      createPurchaseOrders: (poList: unknown[]) => Promise<{ success: boolean }>;
      getProductionPlans: () => Promise<ProductionPlan[]>;
      createProductionPlan: (plan: unknown) => Promise<{ success: boolean; plan_id: number }>;
      getProductLots: () => Promise<ProductLot[]>;
      createProductLot: (lot: unknown) => Promise<{ success: boolean }>;
      createShipment: (shipment: unknown) => Promise<{ success: boolean }>;
      getInventoryLogs: () => Promise<InventoryLog[]>;
      updateInventoryStock: (data: unknown) => Promise<{ success: boolean }>;
    };
  }
}

export const repository = {
  async getProducts(): Promise<Product[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getProducts();
    }
    return [];
  },

  async importProducts(products: unknown[]): Promise<{ success: boolean; count: number }> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.importProducts(products);
    }
    throw new Error('Desktop API is not available');
  },

  async getItems(): Promise<Item[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getItems();
    }
    return [];
  },

  async importItems(items: unknown[]): Promise<{ success: boolean; count: number }> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.importItems(items);
    }
    throw new Error('Desktop API is not available');
  },

  async getCustomers(): Promise<Customer[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getCustomers();
    }
    return [];
  },

  async createCustomer(customer: Omit<Customer, 'customer_id'>) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createCustomer(customer);
    }
    throw new Error('Desktop API is not available');
  },

  async importCustomers(customers: unknown[]) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.importCustomers(customers);
    }
    throw new Error('Desktop API is not available');
  },

  async getOrders(): Promise<Order[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getOrders();
    }
    return [];
  },

  async createOrder(orderInput: unknown) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createOrder(orderInput);
    }
    throw new Error('Desktop API is not available');
  },

  async getUnplannedRequirements(): Promise<UnplannedRequirementResult> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getUnplannedRequirements();
    }
    return { unplannedDetails: [], allBom: [], allItems: [] };
  },

  async createPurchaseOrders(poList: unknown[]) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createPurchaseOrders(poList);
    }
    throw new Error('Desktop API is not available');
  },

  async getProductionPlans(): Promise<ProductionPlan[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getProductionPlans();
    }
    return [];
  },

  async createProductionPlan(plan: unknown) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createProductionPlan(plan);
    }
    throw new Error('Desktop API is not available');
  },

  async getProductLots(): Promise<ProductLot[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getProductLots();
    }
    return [];
  },

  async createProductLot(lot: unknown) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createProductLot(lot);
    }
    throw new Error('Desktop API is not available');
  },

  async createShipment(shipment: unknown) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.createShipment(shipment);
    }
    throw new Error('Desktop API is not available');
  },

  async getInventoryLogs(): Promise<InventoryLog[]> {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.getInventoryLogs();
    }
    return [];
  },

  async updateInventoryStock(data: unknown) {
    if (typeof window !== 'undefined' && window.api) {
      return await window.api.updateInventoryStock(data);
    }
    throw new Error('Desktop API is not available');
  },
};