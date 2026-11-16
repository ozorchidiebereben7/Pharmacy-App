export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','apprentice')),
  pin_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  default_sale_price REAL NOT NULL DEFAULT 0,
  reorder_threshold INTEGER NOT NULL DEFAULT 5,
  created_by TEXT,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_name ON items (name COLLATE NOCASE);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  batch_number TEXT,
  quantity_received INTEGER NOT NULL,
  quantity_remaining INTEGER NOT NULL,
  expiry_date TEXT NOT NULL,
  cost_price_at_purchase REAL NOT NULL,
  date_received TEXT NOT NULL,
  supplier_name TEXT
);
CREATE INDEX IF NOT EXISTS idx_batches_item ON batches (item_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches (expiry_date);

CREATE TABLE IF NOT EXISTS sales (
  id TEXT PRIMARY KEY,
  receipt_no INTEGER UNIQUE NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  total_amount REAL NOT NULL,
  total_cost REAL NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash','Transfer','POS')),
  sold_by TEXT NOT NULL REFERENCES users(id),
  treatment_note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  voided_by TEXT,
  voided_at TEXT,
  provisional INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales (date);
CREATE INDEX IF NOT EXISTS idx_sales_sold_by ON sales (sold_by);

CREATE TABLE IF NOT EXISTS sale_items (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  item_id TEXT NOT NULL REFERENCES items(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  quantity INTEGER NOT NULL,
  unit_price_at_sale REAL NOT NULL,
  cost_price_at_sale REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items (sale_id);

CREATE TABLE IF NOT EXISTS stock_adjustments (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  batch_id TEXT NOT NULL REFERENCES batches(id),
  signed_quantity INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  linked_sale_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_adjustments_date ON stock_adjustments (date);

CREATE TABLE IF NOT EXISTS price_history (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES items(id),
  old_price REAL NOT NULL,
  new_price REAL NOT NULL,
  changed_by TEXT NOT NULL REFERENCES users(id),
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS day_closeouts (
  id TEXT PRIMARY KEY,
  date TEXT UNIQUE NOT NULL,
  total_sales REAL NOT NULL,
  total_cost REAL NOT NULL,
  gross_profit REAL NOT NULL,
  expected_cash REAL NOT NULL,
  counted_cash REAL NOT NULL,
  variance REAL NOT NULL,
  adjustments_count INTEGER NOT NULL,
  closed_by TEXT NOT NULL REFERENCES users(id),
  closed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('SALE','VOID','ADD_STOCK','ADJUST','PRICE','CLOSEOUT','LOGIN','STAFF')),
  table_affected TEXT NOT NULL,
  before_value TEXT,
  after_value TEXT,
  timestamp TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_log (timestamp);
`;
