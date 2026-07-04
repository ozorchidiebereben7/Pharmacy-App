import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { FieldError } from '../components/FieldError';
import { addStock, adjustStock, REMOVAL_REASONS, ADDITION_REASONS } from '../lib/stockEngine';
import { findNearDuplicates } from '../lib/fuzzy';
import { formatDate, formatMoney } from '../lib/format';

function AddNewStockTab() {
  const { engine, currentUser } = useApp();
  const allItems = useMemo(() => engine.all(`SELECT * FROM items ORDER BY name ASC`), [engine]);
  const [form, setForm] = useState({
    itemId: '',
    name: '',
    category: '',
    unit: 'unit',
    defaultSalePrice: '',
    reorderThreshold: '5',
    batchNumber: '',
    quantityReceived: '',
    costPrice: '',
    expiryDate: '',
    supplierName: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  const isNewItem = form.name && !form.itemId;
  const duplicates = isNewItem ? findNearDuplicates(form.name, allItems) : [];

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const errors = {
    name: !form.name.trim() ? 'Item name is required.' : '',
    quantityReceived: !form.quantityReceived || Number(form.quantityReceived) <= 0 ? 'Enter a quantity greater than zero.' : '',
    costPrice: form.costPrice === '' || Number(form.costPrice) < 0 ? 'Enter a valid cost price.' : '',
    expiryDate: !form.expiryDate ? 'Expiry date is required.' : '',
    batchNumber: !form.batchNumber.trim() ? 'Batch number is required.' : '',
    defaultSalePrice: isNewItem && (form.defaultSalePrice === '' || Number(form.defaultSalePrice) < 0) ? 'Enter a sale price.' : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const selectExistingItem = (item) => {
    setForm((f) => ({ ...f, itemId: item.id, name: item.name, unit: item.unit, defaultSalePrice: String(item.default_sale_price) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (hasErrors) return;
    setSaving(true);
    try {
      await addStock(engine, {
        itemId: form.itemId || undefined,
        name: form.name,
        category: form.category,
        unit: form.unit,
        defaultSalePrice: Number(form.defaultSalePrice) || 0,
        reorderThreshold: Number(form.reorderThreshold) || 5,
        batchNumber: form.batchNumber,
        quantityReceived: Number(form.quantityReceived),
        costPrice: Number(form.costPrice),
        expiryDate: form.expiryDate,
        supplierName: form.supplierName,
        userId: currentUser.id,
      });
      setSuccess(`Added ${form.quantityReceived} unit(s) of ${form.name}.`);
      setForm({ itemId: '', name: '', category: '', unit: 'unit', defaultSalePrice: '', reorderThreshold: '5', batchNumber: '', quantityReceived: '', costPrice: '', expiryDate: '', supplierName: '' });
      setSubmitted(false);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      {success && <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-3)' }}>{success}</div>}
      {serverError && <FieldError message={serverError} />}

      <div className={`field ${submitted && errors.name ? 'has-error' : ''}`}>
        <label>Item name</label>
        <input
          list="existing-items"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value, itemId: allItems.find((i) => i.name === e.target.value)?.id || '' }))}
          placeholder="Search or type a new item name"
        />
        <datalist id="existing-items">
          {allItems.map((i) => (
            <option key={i.id} value={i.name} />
          ))}
        </datalist>
        {submitted && <FieldError message={errors.name} />}
      </div>

      {duplicates.length > 0 && (
        <div className="pill pill-warn" style={{ display: 'block', padding: 'var(--space-3)' }}>
          Similar item{duplicates.length > 1 ? 's' : ''} already exist: {duplicates.map((d) => d.name).join(', ')}. Select one above to avoid splitting stock.
          <div className="chip-row" style={{ marginTop: 8 }}>
            {duplicates.map((d) => (
              <button key={d.id} type="button" className="chip" onClick={() => selectExistingItem(d)}>
                Use "{d.name}"
              </button>
            ))}
          </div>
        </div>
      )}

      {isNewItem && (
        <>
          <div className="grid-2">
            <div className="field">
              <label>Category</label>
              <input value={form.category} onChange={set('category')} placeholder="e.g. Analgesic" />
            </div>
            <div className="field">
              <label>Unit</label>
              <input value={form.unit} onChange={set('unit')} placeholder="tablet, bottle…" />
            </div>
          </div>
          <div className={`field ${submitted && errors.defaultSalePrice ? 'has-error' : ''}`}>
            <label>Sale price (₦ per unit)</label>
            <input type="number" min="0" value={form.defaultSalePrice} onChange={set('defaultSalePrice')} />
            {submitted && <FieldError message={errors.defaultSalePrice} />}
          </div>
          <div className="field">
            <label>Reorder threshold</label>
            <input type="number" min="0" value={form.reorderThreshold} onChange={set('reorderThreshold')} />
          </div>
        </>
      )}

      <div className={`field ${submitted && errors.batchNumber ? 'has-error' : ''}`}>
        <label>Batch number</label>
        <input value={form.batchNumber} onChange={set('batchNumber')} placeholder="e.g. B-2026-014" />
        {submitted && <FieldError message={errors.batchNumber} />}
      </div>

      <div className="grid-2">
        <div className={`field ${submitted && errors.quantityReceived ? 'has-error' : ''}`}>
          <label>Quantity</label>
          <input type="number" min="1" value={form.quantityReceived} onChange={set('quantityReceived')} />
          {submitted && <FieldError message={errors.quantityReceived} />}
        </div>
        <div className={`field ${submitted && errors.costPrice ? 'has-error' : ''}`}>
          <label>Cost price / unit</label>
          <input type="number" min="0" value={form.costPrice} onChange={set('costPrice')} />
          {submitted && <FieldError message={errors.costPrice} />}
        </div>
      </div>

      <div className={`field ${submitted && errors.expiryDate ? 'has-error' : ''}`}>
        <label>Expiry date</label>
        <input type="date" value={form.expiryDate} onChange={set('expiryDate')} />
        {submitted && <FieldError message={errors.expiryDate} />}
      </div>

      <div className="field">
        <label>Supplier (optional)</label>
        <input value={form.supplierName} onChange={set('supplierName')} />
      </div>

      <button className="btn btn-primary btn-cta" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

function AdjustStockTab() {
  const { engine, currentUser, requestReauth } = useApp();
  const items = useMemo(() => engine.all(`SELECT * FROM items ORDER BY name ASC`), [engine]);
  const [direction, setDirection] = useState('remove');
  const [itemId, setItemId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [reason, setReason] = useState('');
  const [quantity, setQuantity] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [serverError, setServerError] = useState('');

  const batches = useMemo(
    () => (itemId ? engine.all(`SELECT * FROM batches WHERE item_id = ? ORDER BY expiry_date ASC`, [itemId]) : []),
    [engine, itemId]
  );
  const selectedBatch = batches.find((b) => b.id === batchId);
  const reasons = direction === 'remove' ? REMOVAL_REASONS : ADDITION_REASONS;

  const errors = {
    itemId: !itemId ? 'Choose an item.' : '',
    batchId: !batchId ? 'Choose a batch.' : '',
    reason: !reason ? 'A reason is required.' : '',
    quantity:
      !quantity || Number(quantity) <= 0
        ? 'Enter a quantity greater than zero.'
        : direction === 'remove' && selectedBatch && Number(quantity) > selectedBatch.quantity_remaining
        ? `Only ${selectedBatch.quantity_remaining} remaining in this batch.`
        : '',
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setServerError('');
    if (hasErrors) return;
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setSaving(true);
    try {
      await adjustStock(engine, { itemId, batchId, direction, reason, quantity: Number(quantity), userId: currentUser.id });
      setSuccess(`Stock ${direction === 'remove' ? 'removed' : 'added'} successfully.`);
      setQuantity('');
      setReason('');
      setSubmitted(false);
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="stack" onSubmit={submit}>
      {success && <div className="pill pill-ok" style={{ display: 'block', padding: 'var(--space-3)' }}>{success}</div>}
      {serverError && <FieldError message={serverError} />}

      <div className="field">
        <label>Direction</label>
        <div className="chip-row">
          <button type="button" className={`chip ${direction === 'remove' ? 'active' : ''}`} onClick={() => { setDirection('remove'); setReason(''); }}>
            − Remove
          </button>
          <button type="button" className={`chip ${direction === 'add' ? 'active' : ''}`} onClick={() => { setDirection('add'); setReason(''); }}>
            ＋ Add back
          </button>
        </div>
      </div>
      <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)', margin: 0 }}>
        Made a mistake on a sale? Void the sale instead of adjusting stock — that keeps revenue and stock linked.
      </p>

      <div className={`field ${submitted && errors.itemId ? 'has-error' : ''}`}>
        <label>Item</label>
        <select value={itemId} onChange={(e) => { setItemId(e.target.value); setBatchId(''); }}>
          <option value="">Select item…</option>
          {items.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        {submitted && <FieldError message={errors.itemId} />}
      </div>

      <div className={`field ${submitted && errors.batchId ? 'has-error' : ''}`}>
        <label>Batch</label>
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} disabled={!itemId}>
          <option value="">Select batch…</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.batch_number || b.id.slice(0, 6)} · {b.quantity_remaining} remaining · exp {formatDate(b.expiry_date)}
            </option>
          ))}
        </select>
        {submitted && <FieldError message={errors.batchId} />}
      </div>

      <div className={`field ${submitted && errors.reason ? 'has-error' : ''}`}>
        <label>Reason</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}>
          <option value="">Select reason…</option>
          {reasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        {submitted && <FieldError message={errors.reason} />}
      </div>

      <div className={`field ${submitted && errors.quantity ? 'has-error' : ''}`}>
        <label>Quantity</label>
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        {submitted && <FieldError message={errors.quantity} />}
      </div>

      <button className="btn btn-primary btn-cta" disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

export default function AddAdjustStockScreen() {
  const [tab, setTab] = useState('add');
  return (
    <div className="screen">
      <TopBar title="Stock" />
      <div className="screen-body stack">
        <div className="chip-row">
          <button className={`chip ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>Add New Stock</button>
          <button className={`chip ${tab === 'adjust' ? 'active' : ''}`} onClick={() => setTab('adjust')}>Adjust Stock</button>
        </div>
        {tab === 'add' ? <AddNewStockTab /> : <AdjustStockTab />}
      </div>
    </div>
  );
}
