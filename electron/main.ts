import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'data', 'bakery_erp.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    backgroundColor: '#121420',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }
}

// --- IPC ハンドラー ---

ipcMain.handle('db:getProducts', () => {
  return db.prepare('SELECT * FROM products ORDER BY product_id').all();
});

ipcMain.handle('db:importProducts', (_event, products: Array<Record<string, unknown>>) => {
  const upsert = db.prepare(`
    INSERT INTO products (
      product_id, product_name, flavor_name, pieces_per_kg, pieces_per_cs,
      pieces_per_pack, is_assort, assort_flavors, lot_rule_type, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(product_id) DO UPDATE SET
      product_name=excluded.product_name,
      flavor_name=excluded.flavor_name,
      pieces_per_kg=excluded.pieces_per_kg,
      pieces_per_cs=excluded.pieces_per_cs,
      pieces_per_pack=excluded.pieces_per_pack,
      is_assort=excluded.is_assort,
      assort_flavors=excluded.assort_flavors,
      lot_rule_type=excluded.lot_rule_type,
      is_active=excluded.is_active
  `);

  const tx = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const r of rows) {
      upsert.run(
        r.product_id, r.product_name, r.flavor_name,
        Number(r.pieces_per_kg), Number(r.pieces_per_cs), Number(r.pieces_per_pack),
        Number(r.is_assort || 0), r.assort_flavors || null,
        r.lot_rule_type || 'NORMAL', r.is_active !== undefined ? Number(r.is_active) : 1
      );
    }
  });
  tx(products);
  return { success: true, count: products.length };
});

ipcMain.handle('db:getItems', () => {
  return db.prepare('SELECT * FROM items ORDER BY category DESC, item_id ASC').all();
});

ipcMain.handle('db:importItems', (_event, items: Array<Record<string, unknown>>) => {
  const upsert = db.prepare(`
    INSERT INTO items (
      item_id, item_name, category, spec_qty, unit, unit_price,
      safety_stock, supplier_name, maker_name, current_stock
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(item_id) DO UPDATE SET
      item_name=excluded.item_name,
      category=excluded.category,
      spec_qty=excluded.spec_qty,
      unit=excluded.unit,
      unit_price=excluded.unit_price,
      safety_stock=excluded.safety_stock,
      supplier_name=excluded.supplier_name,
      maker_name=excluded.maker_name
  `);

  const tx = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const r of rows) {
      upsert.run(
        r.item_id, r.item_name, r.category,
        Number(r.spec_qty), r.unit, Number(r.unit_price),
        Number(r.safety_stock || 0), r.supplier_name || '',
        r.maker_name || '', Number(r.current_stock || 0)
      );
    }
  });
  tx(items);
  return { success: true, count: items.length };
});

ipcMain.handle('db:getCustomers', () => {
  return db.prepare('SELECT * FROM customers ORDER BY customer_id').all();
});

ipcMain.handle('db:createCustomer', (_event, customer: Record<string, unknown>) => {
  const stmt = db.prepare(`
    INSERT INTO customers (customer_name, postal_code, address, contact_info, contact_person)
    VALUES (?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    customer.customer_name,
    customer.postal_code || '',
    customer.address || '',
    customer.contact_info || '',
    customer.contact_person || ''
  );
  return { success: true, customer_id: info.lastInsertRowid };
});

ipcMain.handle('db:importCustomers', (_event, customers: Array<Record<string, unknown>>) => {
  const insert = db.prepare(`
    INSERT INTO customers (customer_name, postal_code, address, contact_info, contact_person)
    VALUES (?, ?, ?, ?, ?)
  `);
  const tx = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const r of rows) {
      insert.run(r.customer_name, r.postal_code || '', r.address || '', r.contact_info || '', r.contact_person || '');
    }
  });
  tx(customers);
  return { success: true, count: customers.length };
});

ipcMain.handle('db:getOrders', () => {
  const orders = db.prepare(`
    SELECT o.*, c.customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    ORDER BY o.scheduled_ship_date ASC, o.order_id DESC
  `).all() as Array<Record<string, unknown>>;

  const getDetails = db.prepare(`
    SELECT od.*, p.product_name, p.flavor_name, p.pieces_per_cs, p.pieces_per_pack
    FROM order_details od
    JOIN products p ON od.product_id = p.product_id
    WHERE od.order_id = ?
  `);

  return orders.map((o) => ({
    ...o,
    details: getDetails.all(o.order_id),
  }));
});

ipcMain.handle('db:createOrder', (_event, orderInput: Record<string, unknown>) => {
  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, customer_id, order_date, scheduled_ship_date, delivery_date, status, notes)
    VALUES (?, ?, ?, ?, ?, 'UNPLANNED', ?)
  `);
  const insertDetail = db.prepare(`
    INSERT INTO order_details (order_id, product_id, order_cs)
    VALUES (?, ?, ?)
  `);

  const tx = db.transaction((data: Record<string, unknown>) => {
    const info = insertOrder.run(
      data.order_no,
      data.customer_id,
      data.order_date,
      data.scheduled_ship_date,
      data.delivery_date,
      data.notes || ''
    );
    const orderId = info.lastInsertRowid;
    const details = data.details as Array<{ product_id: string; order_cs: number }>;
    for (const d of details) {
      insertDetail.run(orderId, d.product_id, Number(d.order_cs));
    }
    return orderId;
  });

  const newId = tx(orderInput);
  return { success: true, order_id: newId };
});

ipcMain.handle('db:getUnplannedRequirements', () => {
  const unplannedDetails = db.prepare(`
    SELECT
      od.detail_id, od.order_id, od.product_id, od.order_cs,
      o.order_no, o.scheduled_ship_date,
      p.product_name, p.flavor_name, p.pieces_per_kg, p.pieces_per_cs
    FROM order_details od
    JOIN orders o ON od.order_id = o.order_id
    JOIN products p ON od.product_id = p.product_id
    WHERE o.status = 'UNPLANNED'
  `).all();

  const allBom = db.prepare('SELECT * FROM bom').all();
  const allItems = db.prepare('SELECT * FROM items').all();

  return { unplannedDetails, allBom, allItems };
});

ipcMain.handle('db:createPurchaseOrders', (_event, poList: Array<Record<string, unknown>>) => {
  const insertPo = db.prepare(`
    INSERT INTO purchase_orders (po_date, supplier_name, item_id, order_lots, total_qty, status)
    VALUES (?, ?, ?, ?, ?, 'ORDERED')
  `);
  const tx = db.transaction((rows: Array<Record<string, unknown>>) => {
    for (const r of rows) {
      insertPo.run(r.po_date, r.supplier_name || '未設定', r.item_id, r.order_lots, r.total_qty);
    }
  });
  tx(poList);
  return { success: true };
});

ipcMain.handle('db:getProductionPlans', () => {
  return db.prepare(`
    SELECT pp.*, p.product_name, p.flavor_name, p.pieces_per_cs
    FROM production_plans pp
    LEFT JOIN products p ON pp.product_id = p.product_id
    ORDER BY pp.plan_date ASC
  `).all();
});

ipcMain.handle('db:createProductionPlan', (_event, plan: Record<string, unknown>) => {
  const stmt = db.prepare(`
    INSERT INTO production_plans (plan_date, product_id, sub_flavor, planned_qty_pieces, planned_base_kg, status, event_title)
    VALUES (?, ?, ?, ?, ?, 'SCHEDULED', ?)
  `);
  const info = stmt.run(
    plan.plan_date,
    plan.product_id,
    plan.sub_flavor || '',
    Number(plan.planned_qty_pieces),
    Number(plan.planned_base_kg),
    plan.event_title || ''
  );
  return { success: true, plan_id: info.lastInsertRowid };
});

ipcMain.handle('db:getProductLots', () => {
  return db.prepare(`
    SELECT pl.*, p.product_name, p.flavor_name
    FROM product_lots pl
    JOIN products p ON pl.product_id = p.product_id
    ORDER BY pl.manufacture_date DESC
  `).all();
});

ipcMain.handle('db:createProductLot', (_event, lot: Record<string, unknown>) => {
  const stmt = db.prepare(`
    INSERT INTO product_lots (lot_number, product_id, manufacture_date, manufactured_cs, current_stock_cs)
    VALUES (?, ?, ?, ?, ?)
  `);
  stmt.run(lot.lot_number, lot.product_id, lot.manufacture_date, Number(lot.manufactured_cs), Number(lot.manufactured_cs));
  return { success: true };
});

ipcMain.handle('db:createShipment', (_event, shipment: Record<string, unknown>) => {
  const insertShipment = db.prepare(`
    INSERT INTO shipments (detail_id, lot_number, shipped_cs, actual_ship_date, actual_ship_time)
    VALUES (?, ?, ?, ?, ?)
  `);
  const updateLotStock = db.prepare(`
    UPDATE product_lots SET current_stock_cs = current_stock_cs - ? WHERE lot_number = ?
  `);
  const updateOrderStatus = db.prepare(`
    UPDATE orders SET status = 'SHIPPED' WHERE order_id = (SELECT order_id FROM order_details WHERE detail_id = ?)
  `);

  const tx = db.transaction((s: Record<string, unknown>) => {
    insertShipment.run(s.detail_id, s.lot_number, Number(s.shipped_cs), s.actual_ship_date, s.actual_ship_time);
    updateLotStock.run(Number(s.shipped_cs), s.lot_number);
    updateOrderStatus.run(s.detail_id);
  });
  tx(shipment);
  return { success: true };
});

ipcMain.handle('db:getInventoryLogs', () => {
  return db.prepare('SELECT * FROM inventory_logs ORDER BY created_at DESC LIMIT 100').all();
});

ipcMain.handle('db:updateInventoryStock', (_event, data: Record<string, unknown>) => {
  const { target_type, target_id, new_stock, reason } = data;
  if (target_type === 'ITEM') {
    db.prepare('UPDATE items SET current_stock = ? WHERE item_id = ?').run(Number(new_stock), target_id);
  } else {
    db.prepare('UPDATE product_lots SET current_stock_cs = ? WHERE lot_number = ?').run(Number(new_stock), target_id);
  }
  db.prepare(`
    INSERT INTO inventory_logs (target_type, target_id, change_qty, reason, created_at)
    VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
  `).run(target_type, target_id, Number(new_stock), reason || '棚卸調整');
  return { success: true };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});