import { todayISO, nowTime } from './format';
import { allocateFefo } from './stockEngine';
import { assertDayOpen } from './dayLock';

export async function createSale(engine, { cartLines, paymentMethod, treatmentNote, soldBy, provisional }) {
  if (!cartLines || cartLines.length === 0) throw new Error('Cart is empty.');
  const date = todayISO();
  const time = nowTime();

  return engine.transaction(async (e) => {
    assertDayOpen(e, date);

    const saleId = crypto.randomUUID();
    const lineDetails = [];
    let totalAmount = 0;
    let totalCost = 0;

    for (const line of cartLines) {
      const item = e.one(`SELECT * FROM items WHERE id = ?`, [line.itemId]);
      if (!item) throw new Error('Item no longer exists.');
      const allocations = allocateFefo(e, line.itemId, line.quantity, date);
      const unitPrice = item.default_sale_price;

      for (const alloc of allocations) {
        const batch = e.one(`SELECT * FROM batches WHERE id = ?`, [alloc.batch_id]);
        const newRemaining = batch.quantity_remaining - alloc.quantity;
        e.run(`UPDATE batches SET quantity_remaining = ? WHERE id = ?`, [newRemaining, alloc.batch_id]);

        const saleItemId = crypto.randomUUID();
        e.run(
          `INSERT INTO sale_items (id, sale_id, item_id, batch_id, quantity, unit_price_at_sale, cost_price_at_sale)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [saleItemId, saleId, line.itemId, alloc.batch_id, alloc.quantity, unitPrice, alloc.cost_price_at_purchase]
        );

        totalAmount += alloc.quantity * unitPrice;
        totalCost += alloc.quantity * alloc.cost_price_at_purchase;

        lineDetails.push({
          itemId: line.itemId,
          itemName: item.name,
          batchId: alloc.batch_id,
          batchNumber: alloc.batch_number,
          expiryDate: alloc.expiry_date,
          quantity: alloc.quantity,
          unitPrice,
        });
      }
    }

    const maxReceipt = e.one(`SELECT MAX(receipt_no) as maxNo FROM sales`);
    const receiptNo = (maxReceipt?.maxNo || 0) + 1;
    const createdAt = new Date().toISOString();

    e.run(
      `INSERT INTO sales (id, receipt_no, date, time, total_amount, total_cost, payment_method, sold_by, treatment_note, status, provisional, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [saleId, receiptNo, date, time, totalAmount, totalCost, paymentMethod, soldBy, treatmentNote || null, provisional ? 1 : 0, createdAt]
    );

    e.logActivity({
      userId: soldBy,
      action: 'SALE',
      tableAffected: 'sales',
      before: null,
      after: { sale_id: saleId, receipt_no: receiptNo, total_amount: totalAmount, lines: lineDetails.length },
      timestamp: createdAt,
    });

    return {
      saleId,
      receiptNo,
      date,
      time,
      totalAmount,
      totalCost,
      paymentMethod,
      treatmentNote,
      soldBy,
      lines: lineDetails,
    };
  });
}

export async function voidSale(engine, { saleId, userId }) {
  return engine.transaction(async (e) => {
    const sale = e.one(`SELECT * FROM sales WHERE id = ?`, [saleId]);
    if (!sale) throw new Error('Sale not found.');
    if (sale.status === 'void') throw new Error('This sale has already been voided.');
    assertDayOpen(e, sale.date);

    const items = e.all(`SELECT * FROM sale_items WHERE sale_id = ?`, [saleId]);
    for (const line of items) {
      const batch = e.one(`SELECT * FROM batches WHERE id = ?`, [line.batch_id]);
      if (batch) {
        e.run(`UPDATE batches SET quantity_remaining = quantity_remaining + ? WHERE id = ?`, [line.quantity, line.batch_id]);
      }
    }

    const now = new Date().toISOString();
    e.run(`UPDATE sales SET status = 'void', voided_by = ?, voided_at = ? WHERE id = ?`, [userId, now, saleId]);

    e.logActivity({
      userId,
      action: 'VOID',
      tableAffected: 'sales',
      before: { status: 'active' },
      after: { status: 'void', restored_lines: items.length },
      timestamp: now,
    });

    return { saleId };
  });
}
