import { todayISO } from './format';

export function searchSellableItems(engine, term, asOf = todayISO(), limit = 30) {
  const like = `%${term.trim()}%`;
  return engine.all(
    `SELECT i.id as itemId, i.name, i.unit, i.default_sale_price as unitPrice,
            COALESCE(SUM(CASE WHEN b.expiry_date >= ? AND b.quantity_remaining > 0 THEN b.quantity_remaining ELSE 0 END), 0) as available
     FROM items i
     LEFT JOIN batches b ON b.item_id = i.id
     WHERE i.name LIKE ? ESCAPE '\\'
     GROUP BY i.id
     HAVING available > 0
     ORDER BY i.name ASC
     LIMIT ?`,
    [asOf, like, limit]
  );
}
