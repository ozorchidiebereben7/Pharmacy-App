import { todayISO } from './format';

export function getTodayStats(engine, date = todayISO()) {
  return engine.one(
    `SELECT COALESCE(SUM(total_amount),0) as revenue, COALESCE(SUM(total_amount - total_cost),0) as profit, COUNT(*) as txCount
     FROM sales WHERE date = ? AND status = 'active'`,
    [date]
  );
}

export function getMySalesCount(engine, userId, date = todayISO()) {
  const row = engine.one(
    `SELECT COUNT(*) as c FROM sales WHERE date = ? AND sold_by = ? AND status = 'active'`,
    [date, userId]
  );
  return row.c;
}

export function getExpiringBatchIds(engine, asOf = todayISO()) {
  const cutoff = new Date(`${asOf}T00:00:00`);
  cutoff.setDate(cutoff.getDate() + 7);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return engine.all(
    `SELECT id FROM batches WHERE quantity_remaining > 0 AND expiry_date <= ?`,
    [cutoffISO]
  );
}

export function getSaleDetail(engine, saleId) {
  const sale = engine.one(
    `SELECT s.*, u.name as soldByName FROM sales s JOIN users u ON u.id = s.sold_by WHERE s.id = ?`,
    [saleId]
  );
  if (!sale) return null;
  const items = engine.all(
    `SELECT si.*, i.name as itemName, b.batch_number as batchNumber, b.expiry_date as expiryDate
     FROM sale_items si
     JOIN items i ON i.id = si.item_id
     JOIN batches b ON b.id = si.batch_id
     WHERE si.sale_id = ?`,
    [saleId]
  );
  return {
    saleId: sale.id,
    receiptNo: sale.receipt_no,
    date: sale.date,
    time: sale.time,
    totalAmount: sale.total_amount,
    totalCost: sale.total_cost,
    paymentMethod: sale.payment_method,
    treatmentNote: sale.treatment_note,
    status: sale.status,
    soldByName: sale.soldByName,
    voidedBy: sale.voided_by,
    voidedAt: sale.voided_at,
    lines: items.map((l) => ({
      itemId: l.item_id,
      itemName: l.itemName,
      batchId: l.batch_id,
      batchNumber: l.batchNumber,
      expiryDate: l.expiryDate,
      quantity: l.quantity,
      unitPrice: l.unit_price_at_sale,
      costPrice: l.cost_price_at_sale,
    })),
  };
}

export function getStockListItems(engine, asOf = todayISO()) {
  const items = engine.all(
    `SELECT i.*, COALESCE(SUM(b.quantity_remaining),0) as totalRemaining, MIN(CASE WHEN b.quantity_remaining > 0 THEN b.expiry_date END) as soonestExpiry
     FROM items i LEFT JOIN batches b ON b.item_id = i.id
     GROUP BY i.id
     ORDER BY (soonestExpiry IS NULL), soonestExpiry ASC, i.name ASC`
  );
  const cutoff = new Date(`${asOf}T00:00:00`);
  cutoff.setDate(cutoff.getDate() + 30);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  return items.map((i) => ({
    ...i,
    isLowStock: i.totalRemaining <= i.reorder_threshold,
    isExpiring: i.soonestExpiry != null && i.soonestExpiry <= cutoffISO,
  }));
}

export function getBatchesForItem(engine, itemId) {
  return engine.all(`SELECT * FROM batches WHERE item_id = ? ORDER BY expiry_date ASC`, [itemId]);
}

export function getSalesList(engine, { date, staffId, onlyUserId }) {
  const clauses = ['s.date = ?'];
  const params = [date];
  if (staffId) {
    clauses.push('s.sold_by = ?');
    params.push(staffId);
  }
  if (onlyUserId) {
    clauses.push('s.sold_by = ?');
    params.push(onlyUserId);
  }
  const sales = engine.all(
    `SELECT s.*, u.name as soldByName FROM sales s JOIN users u ON u.id = s.sold_by
     WHERE ${clauses.join(' AND ')}
     ORDER BY s.time DESC, s.created_at DESC`,
    params
  );
  return sales.map((s) => {
    const items = engine.all(
      `SELECT si.quantity, i.name FROM sale_items si JOIN items i ON i.id = si.item_id WHERE si.sale_id = ?`,
      [s.id]
    );
    return {
      id: s.id,
      receiptNo: s.receipt_no,
      date: s.date,
      time: s.time,
      totalAmount: s.total_amount,
      totalCost: s.total_cost,
      paymentMethod: s.payment_method,
      status: s.status,
      soldByName: s.soldByName,
      itemsSummary: items.map((i) => `${i.name} ×${i.quantity}`).join(', '),
    };
  });
}

export function getLowStockItems(engine) {
  return engine.all(
    `SELECT i.id as itemId, i.name, i.reorder_threshold as reorderThreshold, COALESCE(SUM(b.quantity_remaining),0) as remaining
     FROM items i LEFT JOIN batches b ON b.item_id = i.id
     GROUP BY i.id
     HAVING remaining <= i.reorder_threshold`
  );
}
