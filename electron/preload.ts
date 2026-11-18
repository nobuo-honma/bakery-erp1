import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  getProducts: () => ipcRenderer.invoke('db:getProducts'),
  importProducts: (products: unknown[]) => ipcRenderer.invoke('db:importProducts', products),
  getItems: () => ipcRenderer.invoke('db:getItems'),
  importItems: (items: unknown[]) => ipcRenderer.invoke('db:importItems', items),
  getCustomers: () => ipcRenderer.invoke('db:getCustomers'),
  createCustomer: (customer: unknown) => ipcRenderer.invoke('db:createCustomer', customer),
  importCustomers: (customers: unknown[]) => ipcRenderer.invoke('db:importCustomers', customers),
  getOrders: () => ipcRenderer.invoke('db:getOrders'),
  createOrder: (orderInput: unknown) => ipcRenderer.invoke('db:createOrder', orderInput),
  getUnplannedRequirements: () => ipcRenderer.invoke('db:getUnplannedRequirements'),
  createPurchaseOrders: (poList: unknown[]) => ipcRenderer.invoke('db:createPurchaseOrders', poList),
  getProductionPlans: () => ipcRenderer.invoke('db:getProductionPlans'),
  createProductionPlan: (plan: unknown) => ipcRenderer.invoke('db:createProductionPlan', plan),
  getProductLots: () => ipcRenderer.invoke('db:getProductLots'),
  createProductLot: (lot: unknown) => ipcRenderer.invoke('db:createProductLot', lot),
  createShipment: (shipment: unknown) => ipcRenderer.invoke('db:createShipment', shipment),
  getInventoryLogs: () => ipcRenderer.invoke('db:getInventoryLogs'),
  updateInventoryStock: (data: unknown) => ipcRenderer.invoke('db:updateInventoryStock', data),
});