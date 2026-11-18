import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'bakery_erp.db');
const db = new Database(dbPath);

// 外部キー制約の有効化
db.pragma('foreign_keys = ON');

// 1. テーブル作成
db.exec(`
  DROP TABLE IF EXISTS inventory_logs;
  DROP TABLE IF EXISTS shipments;
  DROP TABLE IF EXISTS purchase_orders;
  DROP TABLE IF EXISTS product_lots;
  DROP TABLE IF EXISTS production_plans;
  DROP TABLE IF EXISTS order_details;
  DROP TABLE IF EXISTS orders;
  DROP TABLE IF EXISTS bom;
  DROP TABLE IF EXISTS customers;
  DROP TABLE IF EXISTS items;
  DROP TABLE IF EXISTS products;

  -- 製品マスタ
  CREATE TABLE products (
    product_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    flavor_name TEXT NOT NULL,
    pieces_per_kg INTEGER NOT NULL,
    pieces_per_cs INTEGER NOT NULL,
    pieces_per_pack INTEGER NOT NULL, -- 1pあたり個数 (アソート3, 50入1, その他2)
    is_assort INTEGER NOT NULL DEFAULT 0, -- 1: アソート親製品
    assort_flavors TEXT, -- JSON配列 (例: '["チョコチップ","ミックスフルーツ","ドライリンゴ"]')
    lot_rule_type TEXT NOT NULL DEFAULT 'NORMAL', -- 'NORMAL' | 'NO_DAY_00' | 'ASSORT_MANUAL'
    is_active INTEGER NOT NULL DEFAULT 1 -- 0: 単品受注不可(TKなど)
  );

  -- 原材料・資材マスタ
  CREATE TABLE items (
    item_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL, -- 'raw_material' | 'material'
    spec_qty REAL NOT NULL,
    unit TEXT NOT NULL,
    unit_price REAL NOT NULL,
    safety_stock REAL NOT NULL DEFAULT 0,
    supplier_name TEXT DEFAULT '',
    maker_name TEXT DEFAULT '',
    current_stock REAL NOT NULL DEFAULT 0
  );

  -- BOMマスタ
  CREATE TABLE bom (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id TEXT NOT NULL,
    item_id TEXT NOT NULL,
    usage_rate REAL NOT NULL,
    calc_basis TEXT NOT NULL, -- 'production_qty' | 'order_qty'
    FOREIGN KEY (product_id) REFERENCES products(product_id),
    FOREIGN KEY (item_id) REFERENCES items(item_id)
  );

  -- 出荷先マスタ
  CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    postal_code TEXT DEFAULT '',
    address TEXT DEFAULT '',
    contact_info TEXT DEFAULT '',
    contact_person TEXT DEFAULT ''
  );

  -- 受注ヘッダー
  CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_no TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    order_date TEXT NOT NULL,
    scheduled_ship_date TEXT NOT NULL,
    delivery_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPLANNED', -- 'UNPLANNED' | 'PLANNED' | 'IN_PROGRESS' | 'SHIPPED'
    notes TEXT DEFAULT '',
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
  );

  -- 受注明細
  CREATE TABLE order_details (
    detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    order_cs INTEGER NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
  );

  -- 製造計画（カレンダー・ガントチャート連動）
  CREATE TABLE production_plans (
    plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date TEXT NOT NULL,
    product_id TEXT NOT NULL,
    sub_flavor TEXT DEFAULT '', -- アソート分割製造時の味名
    planned_qty_pieces INTEGER NOT NULL,
    planned_base_kg REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED'
    event_title TEXT DEFAULT '', -- 行事・イベント登録用
    FOREIGN KEY (product_id) REFERENCES products(product_id)
  );

  -- 製品ロット・在庫
  CREATE TABLE product_lots (
    lot_number TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    manufacture_date TEXT NOT NULL,
    manufactured_cs INTEGER NOT NULL,
    current_stock_cs INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
  );

  -- 原材料・資材発注
  CREATE TABLE purchase_orders (
    po_id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_date TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    item_id TEXT NOT NULL,
    order_lots INTEGER NOT NULL,
    total_qty REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'ORDERED', -- 'ORDERED' | 'RECEIVED'
    FOREIGN KEY (item_id) REFERENCES items(item_id)
  );

  -- 出荷実績
  CREATE TABLE shipments (
    shipment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    detail_id INTEGER NOT NULL,
    lot_number TEXT NOT NULL,
    shipped_cs INTEGER NOT NULL,
    actual_ship_date TEXT NOT NULL,
    actual_ship_time TEXT NOT NULL,
    FOREIGN KEY (detail_id) REFERENCES order_details(detail_id),
    FOREIGN KEY (lot_number) REFERENCES product_lots(lot_number)
  );

  -- 在庫・棚卸履歴
  CREATE TABLE inventory_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    target_type TEXT NOT NULL, -- 'ITEM' | 'PRODUCT'
    target_id TEXT NOT NULL,
    change_qty REAL NOT NULL,
    reason TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// 2. 製品マスタ初期データ投入（確定ルール反映済み）
const insertProduct = db.prepare(`
  INSERT INTO products (product_id, product_name, flavor_name, pieces_per_kg, pieces_per_cs, pieces_per_pack, is_assort, assort_flavors, lot_rule_type, is_active)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const productsData = [
  ['C3', 'キュウメイパン', 'チョコチップ', 29, 48, 2, 0, null, 'NORMAL', 1],
  ['M3', 'キュウメイパン', 'ミックスフルーツ', 29, 48, 2, 0, null, 'NORMAL', 1],
  ['D3', 'キュウメイパン', 'ドライリンゴ', 29, 48, 2, 0, null, 'NORMAL', 1],
  ['H3', 'キュウメイパン', 'ハスカップ', 29, 48, 2, 0, null, 'NORMAL', 1],
  ['SB', 'キュウメイパン', 'シーベリー', 29, 48, 2, 0, null, 'NORMAL', 1],
  ['MA', 'キュウメイパン', 'エコ三味', 29, 10, 3, 1, JSON.stringify(['チョコチップ', 'ミックスフルーツ', 'ドライリンゴ']), 'ASSORT_MANUAL', 1],
  ['TP', 'ECOボックス', 'プチヴェール', 31, 48, 2, 0, null, 'NORMAL', 1],
  ['TO', 'ECOボックス', 'オレンジ', 32, 48, 2, 0, null, 'NORMAL', 1],
  ['TK', 'ECOボックス', '黒豆', 32, 20, 2, 0, null, 'NORMAL', 0], // アソート(FD)専用のため単品無効
  ['CB', 'ECOボックス', 'クランベリー', 33, 48, 2, 0, null, 'NORMAL', 1],
  ['FD', 'ECOボックス', 'オリジナル三味', 31, 20, 3, 1, JSON.stringify(['プチヴェール', 'オレンジ', '黒豆']), 'ASSORT_MANUAL', 1],
  ['YC50', 'e-パン', 'キャラメルチョコ50入', 31, 50, 1, 0, null, 'NO_DAY_00', 1],
  ['YC', 'e-パン', 'キャラメルチョコ', 31, 48, 2, 0, null, 'NORMAL', 1],
  ['YO', 'e-パン', 'ヨコエ オレンジ', 32, 48, 2, 0, null, 'NORMAL', 1],
  ['YO50', 'e-パン', 'ヨコエ オレンジ50入', 31, 50, 1, 0, null, 'NO_DAY_00', 1],
  ['CO', '我が家の救急パン', 'チョコ＆オレンジ', 32, 48, 2, 0, null, 'NORMAL', 1],
  ['PA', '我が家の救急パン', 'パンプキン', 32, 48, 2, 0, null, 'NORMAL', 1],
  ['ST', '我が家の救急パン', 'ストロベリー', 32, 48, 2, 0, null, 'NORMAL', 1],
];

// 3. 原材料・資材マスタ初期データ投入
const insertItem = db.prepare(`
  INSERT INTO items (item_id, item_name, category, spec_qty, unit, unit_price, safety_stock)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const itemsData = [
  ['R001', 'デリソフト', 'raw_material', 10, 'kg', 687, 50],
  ['R002', 'チョコチップHCEE', 'raw_material', 10, 'kg', 2550, 30],
  ['R003', 'アクアクーベルホワイトカカオ', 'raw_material', 10, 'kg', 2180, 20],
  ['R004', 'マスカルポーネ・レジェ', 'raw_material', 1, 'kg', 940, 20],
  ['R005', 'まめまーじゅUSA', 'raw_material', 5, 'kg', 800, 50],
  ['R006', 'ドライクランベリーBR', 'raw_material', 1, 'kg', 1600, 5],
  ['R007', 'デザーンココアパウダーテラロッサ', 'raw_material', 1, 'kg', 4550, 3],
  ['R008', 'あすなろミックス', 'raw_material', 20, 'kg', 237, 0],
  ['R009', 'コア粉', 'raw_material', 20, 'kg', 100, 0],
  ['R010', 'P15菓子パンミックス', 'raw_material', 20, 'kg', 344, 300],
  ['R011', '凍結全卵', 'raw_material', 12, 'kg', 628, 50],
  ['R012', 'オレンジカット５ｍｍ A', 'raw_material', 1, 'kg', 2090, 5],
  ['R013', 'かのこ黒豆', 'raw_material', 4, 'kg', 425, 0],
  ['R014', 'キャラメルチョコチップ', 'raw_material', 10, 'kg', 1440, 20],
  ['R015', 'Eオイルスーパー６０', 'raw_material', 5, 'kg', 15000, 0.5],
  ['R016', 'ミックスフルーツ', 'raw_material', 12, 'kg', 1420, 30],
  ['R017', 'アップルチップ', 'raw_material', 12, 'kg', 1925, 30],
  ['R018', 'ホワイトチョコチップ', 'raw_material', 10, 'kg', 1560, 30],
  ['R019', 'ドライストロベリー', 'raw_material', 4, 'kg', 3600, 3],
  ['R020', 'パンプキンパウダー', 'raw_material', 5, 'kg', 2530, 2],
  ['R021', 'FRイースト', 'raw_material', 8, 'kg', 772, 5],
  ['R022', 'ミルシア', 'raw_material', 5, 'kg', 701, 7.5],
  ['R023', 'ルミナスグランデ', 'raw_material', 10, 'kg', 1111, 30],
  ['R024', 'ショコラクリュホワイト', 'raw_material', 5, 'kg', 1710, 10],
  ['R025', 'プチヴェールパウダー', 'raw_material', 10, 'kg', 510, 1],
  ['R026', 'シーベリーペースト', 'raw_material', 1, 'kg', 5300, 3],
  ['R027', 'ハスカップペースト', 'raw_material', 1, 'kg', 5000, 3],
  ['R028', 'ブルーベリー', 'raw_material', 1, 'kg', 1, 0],
  ['M001', '三方袋', 'material', 2800, '枚', 17.5, 5000],
  ['M002', 'マフィンカップ', 'material', 1500, '枚', 13.9, 5000],
  ['M003', 'グラシン紙', 'material', 1000, '枚', 2.2, 5000],
  ['M004', 'シュリンクロール', 'material', 2, '本', 5100, 2],
  ['M005', 'メルト', 'material', 1, '袋', 2700, 2],
  ['M006', 'キャラメルチョコ用シール', 'material', 5000, '枚', 3.4, 0],
  ['M007', 'オレンジ用シール', 'material', 5000, '枚', 3.4, 0],
  ['M008', '（小）チョコチップ', 'material', 300, '枚', 23.5, 0],
  ['M009', '（小）ミックスフルーツ', 'material', 300, '枚', 23.5, 0],
  ['M010', '（小）ドライリンゴ', 'material', 300, '枚', 23.5, 0],
  ['M011', '（小）ハスカップ', 'material', 300, '枚', 23.5, 0],
  ['M012', '（小）シーベリー', 'material', 300, '枚', 23.5, 0],
  ['M013', '（小）プチヴェール', 'material', 400, '枚', 33, 0],
  ['M014', '（小）オレンジ', 'material', 400, '枚', 33, 0],
  ['M015', '（小）クランベリー', 'material', 400, '枚', 33, 0],
  ['M016', '（小）キャラメルチョコ', 'material', 400, '枚', 33, 0],
  ['M017', '（小）ヨコエ オレンジ', 'material', 400, '枚', 33, 0],
  ['M018', '（小）チョコ＆オレンジ', 'material', 500, '枚', 39.9, 360],
  ['M019', '（小）パンプキン', 'material', 500, '枚', 39.9, 360],
  ['M020', '（小）ストロベリー', 'material', 500, '枚', 39.9, 360],
  ['M021', '（小）エコ三味', 'material', 500, '枚', 33, 0],
  ['M022', '（小）オリジナル三味', 'material', 500, '枚', 65, 0],
  ['M023', '（外）チョコチップ', 'material', 20, '枚', 96, 0],
  ['M024', '（外）ミックスフルーツ', 'material', 20, '枚', 96, 0],
  ['M025', '（外）ドライリンゴ', 'material', 20, '枚', 96, 0],
  ['M026', '（外）ハスカップ', 'material', 20, '枚', 96, 0],
  ['M027', '（外）シーベリー', 'material', 20, '枚', 96, 0],
  ['M028', '（外）プチヴェール', 'material', 20, '枚', 96, 0],
  ['M029', '（外）オレンジ', 'material', 20, '枚', 96, 0],
  ['M030', '（外）クランベリー', 'material', 20, '枚', 96, 0],
  ['M031', '（外）キャラメルチョコ50入', 'material', 20, '枚', 96, 0],
  ['M032', '（外）キャラメルチョコ', 'material', 20, '枚', 96, 0],
  ['M033', '（外）ヨコエ オレンジ50入', 'material', 20, '枚', 96, 0],
  ['M034', '（外）ヨコエ オレンジ', 'material', 20, '枚', 96, 0],
  ['M035', '（外）チョコ＆オレンジ', 'material', 20, '枚', 109, 15],
  ['M036', '（外）パンプキン', 'material', 20, '枚', 109, 15],
  ['M037', '（外）ストロベリー', 'material', 20, '枚', 109, 15],
  ['M038', '（外）エコ三味', 'material', 20, '枚', 75, 0],
  ['M039', '（外）オリジナル三味', 'material', 20, '枚', 96, 0],
  ['M040', 'ふるさと納税12入', 'material', 20, '枚', 40, 0],
  ['M041', 'ふるさと納税6入', 'material', 20, '枚', 39, 40],
  ['M042', '角当て', 'material', 50, '枚', 300, 0],
];

// 4. BOM初期データ投入（MA/FD親統合・YO50補正済み）
const insertBom = db.prepare(`
  INSERT INTO bom (product_id, item_id, usage_rate, calc_basis)
  VALUES (?, ?, ?, ?)
`);

// 共通レシピ定義ヘルパー
const kyumeiBase = [
  ['R010', 1], ['R011', 0.15], ['R001', 0.15], ['R005', 0.15],
  ['R003', 0.05], ['R004', 0.05], ['R015', 0.0001], ['R021', 0.045]
];
const ecoBoxBase = [
  ['R008', 1], ['R009', 0.1], ['R011', 0.15], ['R023', 0.15],
  ['R005', 0.15], ['R024', 0.1], ['R015', 0.0001], ['R021', 0.03]
];
const wagayaBase = [
  ['R010', 1], ['R009', 0.1], ['R011', 0.15], ['R023', 0.15],
  ['R005', 0.15], ['R024', 0.1], ['R022', 0.1], ['R015', 0.0001], ['R021', 0.04]
];

const bomData: [string, string, number, string][] = [
  // C3
  ...kyumeiBase.map(([id, r]) => ['C3', id, r, 'production_qty'] as [string, string, number, string]),
  ['C3', 'R002', 0.15, 'production_qty'],
  ['C3', 'M002', 48, 'order_qty'], ['C3', 'M003', 48, 'order_qty'], ['C3', 'M001', 48, 'order_qty'],
  ['C3', 'M008', 24, 'order_qty'], ['C3', 'M023', 1, 'order_qty'], ['C3', 'M004', 0.0024, 'order_qty'],

  // M3
  ...kyumeiBase.map(([id, r]) => ['M3', id, r, 'production_qty'] as [string, string, number, string]),
  ['M3', 'R016', 0.15, 'production_qty'],
  ['M3', 'M002', 48, 'order_qty'], ['M3', 'M003', 48, 'order_qty'], ['M3', 'M001', 48, 'order_qty'],
  ['M3', 'M009', 24, 'order_qty'], ['M3', 'M024', 1, 'order_qty'], ['M3', 'M004', 0.0024, 'order_qty'],

  // D3
  ...kyumeiBase.map(([id, r]) => ['D3', id, r, 'production_qty'] as [string, string, number, string]),
  ['D3', 'R017', 0.15, 'production_qty'],
  ['D3', 'M002', 48, 'order_qty'], ['D3', 'M003', 48, 'order_qty'], ['D3', 'M001', 48, 'order_qty'],
  ['D3', 'M010', 24, 'order_qty'], ['D3', 'M025', 1, 'order_qty'], ['D3', 'M004', 0.0024, 'order_qty'],

  // H3
  ['H3', 'R010', 1, 'production_qty'], ['H3', 'R001', 0.15, 'production_qty'], ['H3', 'R005', 0.2, 'production_qty'],
  ['H3', 'R003', 0.1, 'production_qty'], ['H3', 'R015', 0.0001, 'production_qty'], ['H3', 'R021', 0.045, 'production_qty'],
  ['H3', 'R018', 0.15, 'production_qty'], ['H3', 'R027', 0.1, 'production_qty'],
  ['H3', 'M002', 48, 'order_qty'], ['H3', 'M003', 48, 'order_qty'], ['H3', 'M001', 48, 'order_qty'],
  ['H3', 'M011', 24, 'order_qty'], ['H3', 'M026', 1, 'order_qty'], ['H3', 'M004', 0.0024, 'order_qty'],

  // SB
  ['SB', 'R010', 1, 'production_qty'], ['SB', 'R001', 0.15, 'production_qty'], ['SB', 'R005', 0.2, 'production_qty'],
  ['SB', 'R003', 0.1, 'production_qty'], ['SB', 'R015', 0.0001, 'production_qty'], ['SB', 'R021', 0.045, 'production_qty'],
  ['SB', 'R018', 0.15, 'production_qty'], ['SB', 'R026', 0.1, 'production_qty'],
  ['SB', 'M002', 48, 'order_qty'], ['SB', 'M003', 48, 'order_qty'], ['SB', 'M001', 48, 'order_qty'],
  ['SB', 'M012', 24, 'order_qty'], ['SB', 'M027', 1, 'order_qty'], ['SB', 'M004', 0.0024, 'order_qty'],

  // MA（エコ三味：親統合・3種均等配合）
  ...kyumeiBase.map(([id, r]) => ['MA', id, r, 'production_qty'] as [string, string, number, string]),
  ['MA', 'R002', 0.05, 'production_qty'], // 0.15 / 3
  ['MA', 'R016', 0.05, 'production_qty'], // 0.15 / 3
  ['MA', 'R017', 0.05, 'production_qty'], // 0.15 / 3
  ['MA', 'M002', 30, 'order_qty'], ['MA', 'M003', 30, 'order_qty'], ['MA', 'M001', 30, 'order_qty'], // 10p * 3個 = 30個
  ['MA', 'M021', 10, 'order_qty'], ['MA', 'M038', 1, 'order_qty'], ['MA', 'M004', 0.0048, 'order_qty'],

  // TP
  ...ecoBoxBase.map(([id, r]) => ['TP', id, id === 'R015' ? 0.001 : r, 'production_qty'] as [string, string, number, string]),
  ['TP', 'R025', 0.015, 'production_qty'],
  ['TP', 'M002', 48, 'order_qty'], ['TP', 'M003', 48, 'order_qty'], ['TP', 'M001', 48, 'order_qty'],
  ['TP', 'M013', 24, 'order_qty'], ['TP', 'M028', 1, 'order_qty'], ['TP', 'M004', 0.0024, 'order_qty'],

  // TO
  ...ecoBoxBase.map(([id, r]) => ['TO', id, r, 'production_qty'] as [string, string, number, string]),
  ['TO', 'R012', 0.1, 'production_qty'],
  ['TO', 'M002', 48, 'order_qty'], ['TO', 'M003', 48, 'order_qty'], ['TO', 'M001', 48, 'order_qty'],
  ['TO', 'M014', 24, 'order_qty'], ['TO', 'M029', 1, 'order_qty'], ['TO', 'M004', 0.0024, 'order_qty'],

  // CB
  ...ecoBoxBase.map(([id, r]) => ['CB', id, r, 'production_qty'] as [string, string, number, string]),
  ['CB', 'R007', 0.05, 'production_qty'], ['CB', 'R018', 0.1, 'production_qty'], ['CB', 'R006', 0.1, 'production_qty'],
  ['CB', 'M002', 48, 'order_qty'], ['CB', 'M003', 48, 'order_qty'], ['CB', 'M001', 48, 'order_qty'],
  ['CB', 'M015', 24, 'order_qty'], ['CB', 'M030', 1, 'order_qty'], ['CB', 'M004', 0.0024, 'order_qty'],

  // FD（オリジナル三味：親統合・プチ/オレンジ/黒豆 3種均等配合）
  ...ecoBoxBase.map(([id, r]) => ['FD', id, id === 'R015' ? 0.0004 : r, 'production_qty'] as [string, string, number, string]),
  ['FD', 'R025', 0.005, 'production_qty'],  // 0.015 / 3
  ['FD', 'R012', 0.0334, 'production_qty'], // 0.1 / 3
  ['FD', 'R013', 0.0334, 'production_qty'], // 0.1 / 3
  ['FD', 'M002', 60, 'order_qty'], ['FD', 'M003', 60, 'order_qty'], ['FD', 'M001', 60, 'order_qty'], // 20p * 3個 = 60個
  ['FD', 'M022', 20, 'order_qty'], ['FD', 'M039', 1, 'order_qty'], ['FD', 'M004', 0.0048, 'order_qty'],

  // YC50
  ['YC50', 'R010', 1, 'production_qty'], ['YC50', 'R009', 0.1, 'production_qty'], ['YC50', 'R023', 0.15, 'production_qty'],
  ['YC50', 'R005', 0.15, 'production_qty'], ['YC50', 'R024', 0.1, 'production_qty'], ['YC50', 'R015', 0.0001, 'production_qty'],
  ['YC50', 'R021', 0.03, 'production_qty'], ['YC50', 'R014', 0.1, 'production_qty'],
  ['YC50', 'M002', 50, 'order_qty'], ['YC50', 'M003', 50, 'order_qty'], ['YC50', 'M001', 50, 'order_qty'],
  ['YC50', 'M006', 50, 'order_qty'], ['YC50', 'M031', 1, 'order_qty'],

  // YC
  ['YC', 'R010', 1, 'production_qty'], ['YC', 'R009', 0.1, 'production_qty'], ['YC', 'R023', 0.15, 'production_qty'],
  ['YC', 'R005', 0.15, 'production_qty'], ['YC', 'R024', 0.1, 'production_qty'], ['YC', 'R015', 0.0001, 'production_qty'],
  ['YC', 'R021', 0.03, 'production_qty'], ['YC', 'R014', 0.1, 'production_qty'],
  ['YC', 'M002', 48, 'order_qty'], ['YC', 'M003', 48, 'order_qty'], ['YC', 'M001', 48, 'order_qty'],
  ['YC', 'M016', 24, 'order_qty'], ['YC', 'M032', 1, 'order_qty'], ['YC', 'M004', 0.0024, 'order_qty'],

  // YO
  ['YO', 'R010', 1, 'production_qty'], ['YO', 'R009', 0.1, 'production_qty'], ['YO', 'R011', 0.15, 'production_qty'],
  ['YO', 'R023', 0.15, 'production_qty'], ['YO', 'R005', 0.15, 'production_qty'], ['YO', 'R024', 0.1, 'production_qty'],
  ['YO', 'R015', 0.0001, 'production_qty'], ['YO', 'R021', 0.03, 'production_qty'], ['YO', 'R012', 0.1, 'production_qty'],
  ['YO', 'M002', 48, 'order_qty'], ['YO', 'M003', 48, 'order_qty'], ['YO', 'M001', 48, 'order_qty'],
  ['YO', 'M017', 24, 'order_qty'], ['YO', 'M034', 1, 'order_qty'], ['YO', 'M004', 0.0024, 'order_qty'],

  // YO50（資材数を50枚に補正済み）
  ['YO50', 'R010', 1, 'production_qty'], ['YO50', 'R009', 0.1, 'production_qty'], ['YO50', 'R011', 0.15, 'production_qty'],
  ['YO50', 'R023', 0.15, 'production_qty'], ['YO50', 'R005', 0.15, 'production_qty'], ['YO50', 'R024', 0.1, 'production_qty'],
  ['YO50', 'R015', 0.0001, 'production_qty'], ['YO50', 'R021', 0.03, 'production_qty'], ['YO50', 'R012', 0.1, 'production_qty'],
  ['YO50', 'M002', 50, 'order_qty'], ['YO50', 'M003', 50, 'order_qty'], ['YO50', 'M001', 50, 'order_qty'],
  ['YO50', 'M007', 50, 'order_qty'], ['YO50', 'M033', 1, 'order_qty'],

  // CO
  ...wagayaBase.map(([id, r]) => ['CO', id, r, 'production_qty'] as [string, string, number, string]),
  ['CO', 'R002', 0.08, 'production_qty'], ['CO', 'R012', 0.12, 'production_qty'],
  ['CO', 'M002', 48, 'order_qty'], ['CO', 'M003', 48, 'order_qty'], ['CO', 'M001', 48, 'order_qty'],
  ['CO', 'M018', 24, 'order_qty'], ['CO', 'M035', 1, 'order_qty'], ['CO', 'M004', 0.0024, 'order_qty'],

  // PA
  ...wagayaBase.map(([id, r]) => ['PA', id, r, 'production_qty'] as [string, string, number, string]),
  ['PA', 'R020', 0.05, 'production_qty'], ['PA', 'R018', 0.05, 'production_qty'],
  ['PA', 'M002', 48, 'order_qty'], ['PA', 'M003', 48, 'order_qty'], ['PA', 'M001', 48, 'order_qty'],
  ['PA', 'M019', 24, 'order_qty'], ['PA', 'M036', 1, 'order_qty'], ['PA', 'M004', 0.0024, 'order_qty'],

  // ST
  ...wagayaBase.map(([id, r]) => ['ST', id, r, 'production_qty'] as [string, string, number, string]),
  ['ST', 'R019', 0.11, 'production_qty'], ['ST', 'R018', 0.04, 'production_qty'],
  ['ST', 'M002', 48, 'order_qty'], ['ST', 'M003', 48, 'order_qty'], ['ST', 'M001', 48, 'order_qty'],
  ['ST', 'M020', 24, 'order_qty'], ['ST', 'M037', 1, 'order_qty'], ['ST', 'M004', 0.0024, 'order_qty'],
];

const runInit = db.transaction(() => {
  for (const p of productsData) insertProduct.run(...p);
  for (const i of itemsData) insertItem.run(...i);
  for (const b of bomData) insertBom.run(...b);
});

runInit();
console.log('データベース初期化および全マスタ・BOMデータの登録が完了しました:', dbPath);