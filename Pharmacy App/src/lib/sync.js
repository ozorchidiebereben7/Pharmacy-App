const SYNC_URL = import.meta.env.VITE_SYNC_URL || 'http://localhost:8787';
const SHOP_ID = import.meta.env.VITE_SHOP_ID || 'default';

// Best-effort background backup — failures are swallowed because offline is
// the expected common case, not an error condition, for this app.
export async function pushBackup(bytes) {
  try {
    await fetch(`${SYNC_URL}/api/backup/${SHOP_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Backup-Timestamp': new Date().toISOString(),
      },
      body: bytes,
    });
  } catch {
    /* offline or server unreachable — local IndexedDB copy remains the source of truth */
  }
}

export async function pullLatestBackup() {
  try {
    const res = await fetch(`${SYNC_URL}/api/backup/${SHOP_ID}/latest`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
