import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { EmptyState } from '../components/EmptyState';
import { InfiniteList } from '../components/InfiniteList';
import { Avatar } from '../components/Avatar';

const ACTION_LABELS = {
  SALE: 'Sale',
  VOID: 'Void',
  ADD_STOCK: 'Add Stock',
  ADJUST: 'Adjust',
  PRICE: 'Price Change',
  CLOSEOUT: 'Close-out',
  LOGIN: 'Login',
};

function safeParse(json) {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export default function ActivityLogScreen() {
  const { engine } = useApp();
  const entries = useMemo(
    () =>
      engine
        .all(
          `SELECT al.*, u.name as userName FROM activity_log al
           LEFT JOIN users u ON u.id = al.user_id
           ORDER BY al.timestamp DESC`
        )
        .map((e) => ({ ...e, before: safeParse(e.before_value), after: safeParse(e.after_value) })),
    [engine]
  );

  return (
    <div className="screen">
      <TopBar title="Activity Log" />
      <div className="screen-body stack-sm">
        {entries.length === 0 ? (
          <EmptyState icon="🗂" title="No activity yet" message="Every sale, void, stock change, and login will appear here." />
        ) : (
          <InfiniteList
            items={entries}
            renderItem={(e) => (
              <div key={e.id} className="list-row">
                <div className="row-between">
                  <span className="pill pill-neutral">{ACTION_LABELS[e.action] || e.action}</span>
                  <span style={{ fontSize: 'var(--fs-micro)', color: 'var(--color-faint)' }}>
                    {new Date(e.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="row" style={{ marginTop: 6 }}>
                  <Avatar name={e.userName} size={28} />
                  <div>
                    <div style={{ fontWeight: 600 }}>{e.userName || 'Unknown user'}</div>
                    <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>{e.table_affected}</div>
                  </div>
                </div>
                {(e.before || e.after) && (
                  <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--color-faint)', marginTop: 4, wordBreak: 'break-word' }}>
                    {e.before && <div>Before: {JSON.stringify(e.before)}</div>}
                    {e.after && <div>After: {JSON.stringify(e.after)}</div>}
                  </div>
                )}
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
