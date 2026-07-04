import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { EmptyState } from '../components/EmptyState';
import { searchSellableItems } from '../lib/saleSearch';
import { createSale } from '../lib/salesEngine';
import { formatMoney } from '../lib/format';

const PAYMENT_METHODS = ['Cash', 'Transfer', 'POS'];

export default function NewSaleScreen() {
  const { engine, currentUser } = useApp();
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState({}); // itemId -> {itemId, name, unitPrice, quantity, available}
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payment, setPayment] = useState('Cash');
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(term), 200);
    return () => clearTimeout(t);
  }, [term]);

  useEffect(() => {
    setResults(searchSellableItems(engine, debounced));
  }, [engine, debounced]);

  const cartLines = Object.values(cart).filter((l) => l.quantity > 0);
  const cartCount = cartLines.length;
  const total = cartLines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const setQty = (item, quantity) => {
    const clamped = Math.max(0, Math.min(quantity, item.available));
    setCart((prev) => ({
      ...prev,
      [item.itemId]: { itemId: item.itemId, name: item.name, unitPrice: item.unitPrice, available: item.available, quantity: clamped },
    }));
  };

  const addOne = (item) => {
    const current = cart[item.itemId]?.quantity || 0;
    setQty(item, current + 1);
  };

  const removeLine = (itemId) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const complete = async () => {
    setError('');
    setBusy(true);
    try {
      const sale = await createSale(engine, {
        cartLines: cartLines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
        paymentMethod: payment,
        treatmentNote: note.trim() || null,
        soldBy: currentUser.id,
      });
      navigate(`/sale/receipt/${sale.saleId}`, { state: { sale: { ...sale, soldByName: currentUser.name } } });
    } catch (err) {
      setError(err.message || 'Could not complete sale.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title="New Sale" />
      <div className="screen-body stack">
        <input
          className="search-input"
          type="search"
          placeholder="Search items to sell…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          autoFocus
        />

        {error && (
          <div className="field-error" role="alert" style={{ background: 'var(--color-danger-tint)', padding: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}>
            ⚠ {error}
          </div>
        )}

        <div className="stack-sm">
          {results.length === 0 && debounced && (
            <EmptyState icon="🔍" title="No sellable stock found" message="Check spelling, or this item may be out of stock / all batches expired." />
          )}
          {results.map((item) => {
            const inCart = cart[item.itemId];
            return (
              <div key={item.itemId} className="list-row row-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>
                    {formatMoney(item.unitPrice)} · {item.available} {item.unit} available
                  </div>
                </div>
                {inCart ? (
                  <div className="stepper">
                    <button onClick={() => setQty(item, inCart.quantity - 1)} aria-label="Decrease quantity">−</button>
                    <input
                      className="tabular"
                      type="number"
                      min={0}
                      max={item.available}
                      value={inCart.quantity}
                      onChange={(e) => setQty(item, parseInt(e.target.value, 10) || 0)}
                    />
                    <button onClick={() => setQty(item, inCart.quantity + 1)} aria-label="Increase quantity">+</button>
                  </div>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={() => addOne(item)}>
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {cartCount > 0 && (
        <div style={{ position: 'sticky', bottom: 0, padding: 'var(--space-4)', background: 'var(--color-bg)' }}>
          <button className="btn btn-secondary btn-block" onClick={() => setSheetOpen(true)}>
            Review cart · {cartCount} item{cartCount === 1 ? '' : 's'} · {formatMoney(total)}
          </button>
        </div>
      )}

      {sheetOpen && (
        <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
          <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2 style={{ margin: 0 }}>Review cart · {cartCount} item{cartCount === 1 ? '' : 's'}</h2>
            <div className="stack-sm">
              {cartLines.map((l) => (
                <div key={l.itemId} className="list-row row-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{l.name}</div>
                    <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>{formatMoney(l.unitPrice)} each</div>
                  </div>
                  <div className="row">
                    <div className="stepper">
                      <button onClick={() => setQty(l, l.quantity - 1)} aria-label="Decrease quantity">−</button>
                      <input
                        className="tabular"
                        type="number"
                        min={0}
                        max={l.available}
                        value={l.quantity}
                        onChange={(e) => setQty(l, parseInt(e.target.value, 10) || 0)}
                      />
                      <button onClick={() => setQty(l, l.quantity + 1)} aria-label="Increase quantity">+</button>
                    </div>
                    <button className="link-btn" onClick={() => removeLine(l.itemId)}>Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <button className="link-btn" style={{ textAlign: 'left' }} onClick={() => setNoteOpen((v) => !v)}>
              {noteOpen ? 'Hide treatment note' : '+ Add treatment note'}
            </button>
            {noteOpen && (
              <div className="field">
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dispense / treatment note (optional)" />
              </div>
            )}

            <div className="field">
              <label>Payment method</label>
              <div className="chip-row">
                {PAYMENT_METHODS.map((m) => (
                  <button key={m} className={`chip ${payment === m ? 'active' : ''}`} onClick={() => setPayment(m)}>
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary btn-cta" disabled={busy || cartCount === 0} onClick={complete}>
              {busy ? 'Completing…' : `Complete Sale · ${formatMoney(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
