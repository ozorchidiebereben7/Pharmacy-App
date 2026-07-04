import { isDayLocked } from './dayLock';

export function computeEodSummary(engine, date) {
  const totals = engine.one(
    `SELECT COALESCE(SUM(total_amount),0) as totalSales, COALESCE(SUM(total_cost),0) as totalCost, COUNT(*) as txCount
     FROM sales WHERE date = ? AND status = 'active'`,
    [date]
  );
  const voidCount = engine.one(`SELECT COUNT(*) as c FROM sales WHERE date = ? AND status = 'void'`, [date]);
  const expectedCash = engine.one(
    `SELECT COALESCE(SUM(total_amount),0) as expected FROM sales WHERE date = ? AND status = 'active' AND payment_method = 'Cash'`,
    [date]
  );
  const adjustments = engine.all(
    `SELECT u.name as staffName, sa.adjusted_by as userId,
            SUM(CASE WHEN sa.signed_quantity < 0 THEN -sa.signed_quantity ELSE 0 END) as removed,
            SUM(CASE WHEN sa.signed_quantity > 0 THEN sa.signed_quantity ELSE 0 END) as added,
            COUNT(*) as count
     FROM stock_adjustments sa JOIN users u ON u.id = sa.adjusted_by
     WHERE sa.date = ?
     GROUP BY sa.adjusted_by`,
    [date]
  );
  const adjustmentsCount = adjustments.reduce((s, a) => s + a.count, 0);

  return {
    date,
    totalSales: totals.totalSales,
    totalCost: totals.totalCost,
    grossProfit: totals.totalSales - totals.totalCost,
    transactions: totals.txCount,
    voidCount: voidCount.c,
    expectedCash: expectedCash.expected,
    adjustmentsByStaff: adjustments,
    adjustmentsCount,
  };
}

export async function closeDay(engine, { date, countedCash, userId }) {
  if (isDayLocked(engine, date)) {
    throw new Error(`${date} has already been closed out.`);
  }
  return engine.transaction(async (e) => {
    const summary = computeEodSummary(e, date);
    const variance = countedCash - summary.expectedCash;
    const id = crypto.randomUUID();
    const closedAt = new Date().toISOString();
    e.run(
      `INSERT INTO day_closeouts (id, date, total_sales, total_cost, gross_profit, expected_cash, counted_cash, variance, adjustments_count, closed_by, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, date, summary.totalSales, summary.totalCost, summary.grossProfit, summary.expectedCash, countedCash, variance, summary.adjustmentsCount, userId, closedAt]
    );
    e.logActivity({
      userId,
      action: 'CLOSEOUT',
      tableAffected: 'day_closeouts',
      before: null,
      after: { date, expected_cash: summary.expectedCash, counted_cash: countedCash, variance },
      timestamp: closedAt,
    });
    return { id, variance, summary };
  });
}
