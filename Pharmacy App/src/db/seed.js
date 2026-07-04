import { hashPin } from '../lib/auth';

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function seedIfEmpty(engine) {
  const existing = engine.one(`SELECT COUNT(*) as c FROM users`);
  if (existing.c > 0) return;

  const ownerId = crypto.randomUUID();
  const apprenticeId = crypto.randomUUID();
  const ownerPinHash = await hashPin('1111');
  const apprenticePinHash = await hashPin('2222');
  const now = new Date().toISOString();

  await engine.transaction(async (e) => {
    e.run(
      `INSERT INTO users (id, name, role, pin_hash, created_at, active) VALUES (?, ?, 'owner', ?, ?, 1)`,
      [ownerId, 'Ozed (Owner)', ownerPinHash, now]
    );
    e.run(
      `INSERT INTO users (id, name, role, pin_hash, created_at, active) VALUES (?, ?, 'apprentice', ?, ?, 1)`,
      [apprenticeId, 'Amaka (Apprentice)', apprenticePinHash, now]
    );

    const items = [
      { name: 'Paracetamol 500mg', category: 'Analgesic', unit: 'tablet', price: 50, reorder: 20 },
      { name: 'Amoxicillin 250mg', category: 'Antibiotic', unit: 'capsule', price: 150, reorder: 10 },
      { name: 'Vitamin C 1000mg', category: 'Supplement', unit: 'tablet', price: 80, reorder: 15 },
      { name: 'Cough Syrup 100ml', category: 'Cold & Flu', unit: 'bottle', price: 350, reorder: 5 },
    ];
    const itemIds = {};
    for (const it of items) {
      const id = crypto.randomUUID();
      itemIds[it.name] = id;
      e.run(
        `INSERT INTO items (id, name, category, unit, default_sale_price, reorder_threshold, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, it.name, it.category, it.unit, it.price, it.reorder, ownerId, now]
      );
    }

    const batches = [
      { item: 'Paracetamol 500mg', batchNumber: 'PCM-EXP-01', qty: 30, expiry: addDays(-3), cost: 30, supplier: 'MedSupply Ltd' },
      { item: 'Paracetamol 500mg', batchNumber: 'PCM-NEAR-02', qty: 15, expiry: addDays(5), cost: 32, supplier: 'MedSupply Ltd' },
      { item: 'Paracetamol 500mg', batchNumber: 'PCM-FRESH-03', qty: 100, expiry: addDays(200), cost: 30, supplier: 'MedSupply Ltd' },
      { item: 'Amoxicillin 250mg', batchNumber: 'AMX-01', qty: 40, expiry: addDays(20), cost: 90, supplier: 'HealthPlus Distributors' },
      { item: 'Vitamin C 1000mg', batchNumber: 'VITC-01', qty: 8, expiry: addDays(300), cost: 45, supplier: 'Wellness Wholesale' },
      { item: 'Cough Syrup 100ml', batchNumber: 'CS-01', qty: 25, expiry: addDays(150), cost: 220, supplier: 'MedSupply Ltd' },
    ];
    for (const b of batches) {
      e.run(
        `INSERT INTO batches (id, item_id, batch_number, quantity_received, quantity_remaining, expiry_date, cost_price_at_purchase, date_received, supplier_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), itemIds[b.item], b.batchNumber, b.qty, b.qty, b.expiry, b.cost, now.slice(0, 10), b.supplier]
      );
    }

    e.logActivity({
      userId: ownerId,
      action: 'ADD_STOCK',
      tableAffected: 'batches',
      before: null,
      after: { note: 'Initial demo dataset seeded' },
      timestamp: now,
    });
  });
}
