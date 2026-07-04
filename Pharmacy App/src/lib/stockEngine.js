import { todayISO, nowTime, daysUntil } from './format';

export const REMOVAL_REASONS = ['Damaged', 'Expired', 'Miscount', 'Returned to Supplier'];
export const ADDITION_REASONS = ['Miscount correction', 'Customer return', 'Found / recount'];

export class InsufficientStockError extends Error {
  constructor(itemId, requested, available) {
    super(`Only ${available} unit(s) available, ${requested} requested.`);
    this.name = 'InsufficientStockError';
    this.itemId = itemId;
    this.requested = requested;
    this.available = available;
  }
}

export function isExpired(expiryDate, asOf = todayISO()) {
  return expiryDate < asOf;
}

export function expiryFlag(expiryDate, asOf = todayISO()) {
  if (isExpired(expiryDate, asOf)) return 'red';
  const days = daysUntil(expiryDate, asOf);
  if (days <= 7) return 'red';
  if (days <= 30) return 'amber';
  return 'green';
}

export function sellableBatches(engine, itemId, asOf = todayISO()) {
  return engine.all(
    `SELECT * FROM batches WHERE item_id = ? AND quantity_remaining > 0 AND expiry_date >= ? ORDER BY expiry_date ASC`,
    [itemId, asOf]
  );
}

export function allocateFefo(engine, itemId, qtyNeeded, asOf = todayISO()) {
  const batches = sellableBatches(engine, itemId, asOf);
  let remaining = qtyNeeded;
  const allocations = [];
  for (const b of batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.quantity_remaining);
    allocations.push({
      batch_id: b.id,
      batch_number: b.batch_number,
      expiry_date: b.expiry_date,
      quantity: take,
      cost_price_at_purchase: b.cost_price_at_purchase,
    });
    remaining -= take;
  }
  if (remaining > 0) {
    const totalAvailable = batches.reduce((s, b) => s + b.quantity_remaining, 0);
    throw new InsufficientStockError(itemId, qtyNeeded, totalAvailable);
  }
  return allocations;
}

export function findOrCreateItem(engine, { itemId, name, category, unit, defaultSalePrice, reorderThreshold, userId }) {
  if (itemId) return itemId;
  const id = crypto.randomUUID();
  engine.run(
    `INSERT INTO items (id, name, category, unit, default_sale_price, reorder_threshold, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name.trim(), category || null, unit || 'unit', defaultSalePrice || 0, reorderThreshold ?? 5, userId, new Date().toISOString()]
  );
  return id;
}

export async function addStock(engine, params) {
  const { itemId, name, category, unit, defaultSalePrice, reorderThreshold, batchNumber, quantityReceived, costPrice, expiryDate, supplierName, userId } = params;
  return engine.transaction(async (e) => {
    const resolvedItemId = findOrCreateItem(e, { itemId, name, category, unit, defaultSalePrice, reorderThreshold, userId });
    const batchId = crypto.randomUUID();
    const dateReceived = todayISO();
    e.run(
      `INSERT INTO batches (id, item_id, batch_number, quantity_received, quantity_remaining, expiry_date, cost_price_at_purchase, date_received, supplier_name)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [batchId, resolvedItemId, batchNumber || null, quantityReceived, quantityReceived, expiryDate, costPrice, dateReceived, supplierName || null]
    );
    e.logActivity({
      userId,
      action: 'ADD_STOCK',
      tableAffected: 'batches',
      before: null,
      after: { batch_id: batchId, item_id: resolvedItemId, quantity_received: quantityReceived, expiry_date: expiryDate, cost_price_at_purchase: costPrice },
      timestamp: new Date().toISOString(),
    });
    return { itemId: resolvedItemId, batchId };
  });
}

export async function adjustStock(engine, { itemId, batchId, direction, reason, quantity, userId }) {
  if (!reason) throw new Error('A reason is required for every stock adjustment.');
  if (!quantity || quantity <= 0) throw new Error('Quantity must be greater than zero.');
  return engine.transaction(async (e) => {
    const batch = e.one(`SELECT * FROM batches WHERE id = ?`, [batchId]);
    if (!batch) throw new Error('Batch not found.');
    const signed = direction === 'remove' ? -quantity : quantity;
    if (direction === 'remove' && quantity > batch.quantity_remaining) {
      throw new Error(`Cannot remove ${quantity} — only ${batch.quantity_remaining} remaining in this batch.`);
    }
    const before = { quantity_remaining: batch.quantity_remaining };
    const newQty = batch.quantity_remaining + signed;
    e.run(`UPDATE batches SET quantity_remaining = ? WHERE id = ?`, [newQty, batchId]);
    const adjId = crypto.randomUUID();
    const now = new Date();
    e.run(
      `INSERT INTO stock_adjustments (id, item_id, batch_id, signed_quantity, reason, adjusted_by, date, time, linked_sale_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)`,
      [adjId, itemId, batchId, signed, reason, userId, todayISO(), nowTime()]
    );
    e.logActivity({
      userId,
      action: 'ADJUST',
      tableAffected: 'batches',
      before,
      after: { quantity_remaining: newQty, reason, signed_quantity: signed },
      timestamp: now.toISOString(),
    });
    return { adjId, newQty };
  });
}

export async function editPrice(engine, { itemId, newPrice, userId }) {
  return engine.transaction(async (e) => {
    const item = e.one(`SELECT * FROM items WHERE id = ?`, [itemId]);
    if (!item) throw new Error('Item not found.');
    const oldPrice = item.default_sale_price;
    e.run(`UPDATE items SET default_sale_price = ? WHERE id = ?`, [newPrice, itemId]);
    const now = new Date().toISOString();
    e.run(
      `INSERT INTO price_history (id, item_id, old_price, new_price, changed_by, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), itemId, oldPrice, newPrice, userId, now]
    );
    e.logActivity({
      userId,
      action: 'PRICE',
      tableAffected: 'items',
      before: { default_sale_price: oldPrice },
      after: { default_sale_price: newPrice },
      timestamp: now,
    });
    return { oldPrice, newPrice };
  });
}
