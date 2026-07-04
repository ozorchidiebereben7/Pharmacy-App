import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { EmptyState } from '../components/EmptyState';
import { InfiniteList } from '../components/InfiniteList';
import { getStockListItems, getBatchesForItem } from '../lib/queries';
import { expiryFlag } from '../lib/stockEngine';
import { editPrice } from '../lib/stockEngine';
import { formatDate, formatMoney } from '../lib/format';

function BatchRow({ batch }) {
  const flag = expiryFlag(batch.expiry_date);
  return (
    <div className="row-between" style={{ padding: 'var(--space-2) 0', borderTop: '1px solid var(--color-line)' }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: 'var(--fs-small)' }}>{batch.batch_number || batch.id.slice(0, 6)}</div>
        <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--color-faint)' }}>Cost {formatMoney(batch.cost_price_at_purchase)}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="tabular" style={{ fontWeight: 600 }}>{batch.quantity_remaining} left</div>
        <span className={`pill pill-${flag === 'green' ? 'ok' : flag}`}>{formatDate(batch.expiry_date)}</span>
      </div>
    </div>
  );
}

function StockRow({ item, isOwner, onPriceChanged }) {
  const { engine, currentUser, requestReauth } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(item.default_sale_price));
  const [saving, setSaving] = useState(false);

  const batches = expanded ? getBatchesForItem(engine, item.id) : [];
  const flag = item.soonestExpiry ? expiryFlag(item.soonestExpiry) : 'green';
  const borderClass = flag === 'red' ? 'card-alert-danger' : flag === 'amber' ? 'card-alert-warn' : '';

  const savePrice = async () => {
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setSaving(true);
    try {
      await editPrice(engine, { itemId: item.id, newPrice: Number(priceInput), userId: currentUser.id });
      setEditingPrice(false);
      onPriceChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`card card-flush-left ${borderClass}`}>
      <div className="row-between tap-target" role="button" tabIndex={0} onClick={() => setExpanded((v) => !v)}>
        <div>
          <div style={{ fontWeight: 600 }}>{item.name}</div>
          <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>
            {formatMoney(item.default_sale_price)} · {item.totalRemaining} {item.unit} total
          </div>
        </div>
        <div className="row">
          {item.isLowStock && <span className="pill pill-neutral">Low stock</span>}
          <span aria-hidden="true">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 'var(--space-3)' }}>
          {isOwner && (
            <div className="row-between" style={{ marginBottom: 'var(--space-2)' }}>
              {editingPrice ? (
                <div className="row">
                  <input
                    className="tabular"
                    type="number"
                    min="0"
                    style={{ width: 100, minHeight: 40, border: '1px solid var(--color-line)', borderRadius: 'var(--radius-sm)', padding: '0 8px' }}
                    value={priceInput}
                    onChange={(e) => setPriceInput(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" disabled={saving} onClick={savePrice}>Save</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditingPrice(false)}>Cancel</button>
                </div>
              ) : (
                <button className="link-btn" onClick={() => setEditingPrice(true)}>Edit price</button>
              )}
            </div>
          )}
          {batches.length === 0 ? (
            <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>No batches recorded.</p>
          ) : (
            batches.map((b) => <BatchRow key={b.id} batch={b} />)
          )}
        </div>
      )}
    </div>
  );
}

export default function StockListScreen() {
  const { engine, currentUser } = useApp();
  const isOwner = currentUser.role === 'owner';
  const [searchParams, setSearchParams] = useSearchParams();
  const [term, setTerm] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const filter = searchParams.get('filter') || 'all';

  const allItems = useMemo(() => getStockListItems(engine), [engine, refreshTick]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (term.trim()) {
      const q = term.trim().toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q));
    }
    if (filter === 'expiring') list = list.filter((i) => i.isExpiring);
    if (filter === 'low') list = list.filter((i) => i.isLowStock);
    return list;
  }, [allItems, term, filter]);

  const setFilter = (f) => setSearchParams(f === 'all' ? {} : { filter: f });

  return (
    <div className="screen">
      <TopBar title="Stock List" />
      <div className="screen-body stack">
        <input className="search-input" type="search" placeholder="Search stock…" value={term} onChange={(e) => setTerm(e.target.value)} />
        <div className="chip-row">
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`chip ${filter === 'expiring' ? 'active' : ''}`} onClick={() => setFilter('expiring')}>Expiring</button>
          <button className={`chip ${filter === 'low' ? 'active' : ''}`} onClick={() => setFilter('low')}>Low stock</button>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon="📦" title="No stock found" message="Try a different search or filter, or add new stock from the dashboard." />
        ) : (
          <div className="stack-sm">
            <InfiniteList
              items={filtered}
              renderItem={(item) => (
                <StockRow key={item.id} item={item} isOwner={isOwner} onPriceChanged={() => setRefreshTick((t) => t + 1)} />
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}
