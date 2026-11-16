import { hashPin } from './auth';

export function listAllStaff(engine) {
  return engine.all(
    `SELECT u.id, u.name, u.role, u.active, u.created_at,
            COUNT(CASE WHEN s.status = 'active' THEN 1 END) as salesCount,
            COALESCE(SUM(CASE WHEN s.status = 'active' THEN s.total_amount ELSE 0 END), 0) as totalRevenue
     FROM users u
     LEFT JOIN sales s ON s.sold_by = u.id
     GROUP BY u.id
     ORDER BY u.active DESC, u.role DESC, u.name COLLATE NOCASE ASC`
  );
}

export async function createStaff(engine, { name, role = 'apprentice', pin, actorId }) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Staff name is required.');
  if (!['owner', 'apprentice'].includes(role)) throw new Error('Invalid role.');
  if (!/^\d{4}$/.test(String(pin || ''))) throw new Error('PIN must be 4 digits.');

  const duplicate = engine.one(
    `SELECT id FROM users WHERE LOWER(name) = LOWER(?)`,
    [cleanName]
  );
  if (duplicate) {
    throw new Error(`A staff member named "${cleanName}" already exists.`);
  }

  const pinHash = await hashPin(String(pin));
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  return engine.transaction(async (e) => {
    e.run(
      `INSERT INTO users (id, name, role, pin_hash, created_at, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [id, cleanName, role, pinHash, now]
    );
    e.logActivity({
      userId: actorId,
      action: 'STAFF',
      tableAffected: 'users',
      before: null,
      after: { id, name: cleanName, role, active: 1 },
      timestamp: now,
    });
    return { id, name: cleanName, role, active: 1 };
  });
}

export async function updateStaff(engine, { staffId, name, role, actorId }) {
  const cleanName = (name || '').trim();
  if (!cleanName) throw new Error('Staff name is required.');
  if (!['owner', 'apprentice'].includes(role)) throw new Error('Invalid role.');

  const existing = engine.one(`SELECT * FROM users WHERE id = ?`, [staffId]);
  if (!existing) throw new Error('Staff member not found.');

  const duplicate = engine.one(
    `SELECT id FROM users WHERE LOWER(name) = LOWER(?) AND id != ?`,
    [cleanName, staffId]
  );
  if (duplicate) {
    throw new Error(`Another staff member named "${cleanName}" already exists.`);
  }

  if (existing.role === 'owner' && role !== 'owner' && existing.active === 1) {
    const otherOwners = engine.one(
      `SELECT COUNT(*) as c FROM users WHERE role = 'owner' AND active = 1 AND id != ?`,
      [staffId]
    );
    if (!otherOwners || otherOwners.c === 0) {
      throw new Error('Cannot change role — at least one active owner is required.');
    }
  }

  const now = new Date().toISOString();
  return engine.transaction(async (e) => {
    e.run(`UPDATE users SET name = ?, role = ? WHERE id = ?`, [cleanName, role, staffId]);
    e.logActivity({
      userId: actorId,
      action: 'STAFF',
      tableAffected: 'users',
      before: { name: existing.name, role: existing.role },
      after: { name: cleanName, role },
      timestamp: now,
    });
    return { id: staffId, name: cleanName, role, active: existing.active };
  });
}

export async function setStaffActive(engine, { staffId, active, actorId }) {
  const existing = engine.one(`SELECT * FROM users WHERE id = ?`, [staffId]);
  if (!existing) throw new Error('Staff member not found.');

  const nextActive = active ? 1 : 0;
  if (nextActive === 0) {
    if (staffId === actorId) {
      throw new Error('You cannot deactivate your own currently signed-in account.');
    }
    if (existing.role === 'owner') {
      const otherOwners = engine.one(
        `SELECT COUNT(*) as c FROM users WHERE role = 'owner' AND active = 1 AND id != ?`,
        [staffId]
      );
      if (!otherOwners || otherOwners.c === 0) {
        throw new Error('Cannot deactivate the only active owner.');
      }
    }
  }

  const now = new Date().toISOString();
  return engine.transaction(async (e) => {
    e.run(`UPDATE users SET active = ? WHERE id = ?`, [nextActive, staffId]);
    e.logActivity({
      userId: actorId,
      action: 'STAFF',
      tableAffected: 'users',
      before: { name: existing.name, active: existing.active },
      after: { name: existing.name, active: nextActive },
      timestamp: now,
    });
    return { id: staffId, active: nextActive };
  });
}

export async function resetStaffPin(engine, { staffId, newPin, actorId }) {
  if (!/^\d{4}$/.test(String(newPin || ''))) throw new Error('New PIN must be 4 digits.');
  const existing = engine.one(`SELECT * FROM users WHERE id = ?`, [staffId]);
  if (!existing) throw new Error('Staff member not found.');

  const hash = await hashPin(String(newPin));
  const now = new Date().toISOString();
  return engine.transaction(async (e) => {
    e.run(`UPDATE users SET pin_hash = ? WHERE id = ?`, [hash, staffId]);
    e.logActivity({
      userId: actorId,
      action: 'STAFF',
      tableAffected: 'users',
      before: { name: existing.name, action: 'pin_reset' },
      after: { name: existing.name, pin_updated: true },
      timestamp: now,
    });
    return { id: staffId };
  });
}
