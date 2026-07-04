import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { TopBar } from '../components/TopBar';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { getSalesList } from '../lib/queries';
import { computeEodSummary } from '../lib/dayClose';
import { closeDay } from '../lib/dayClose';
import { voidSale } from '../lib/salesEngine';
import { isDayLocked } from '../lib/dayLock';
import { formatMoney, todayISO } from '../lib/format';

function VariancePill({ variance }) {
  if (variance === 0) return <span className="pill pill-ok">✓ Drawer matches</span>;
  if (variance < 0) return <span className="pill pill-danger">{formatMoney(Math.abs(variance))} SHORT — investigate before closing</span>;
  return <span className="pill pill-warn">{formatMoney(variance)} over</span>;
}

export default function SalesHistoryScreen() {
  const { engine, currentUser, requestReauth } = useApp();
  const isOwner = currentUser.role === 'owner';
  const [date, setDate] = useState(todayISO());
  const [staffId, setStaffId] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [voidTarget, setVoidTarget] = useState(null);
  const [voidBusy, setVoidBusy] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState('');

  const staff = useMemo(() => engine.all(`SELECT id, name FROM users WHERE active = 1 ORDER BY name`), [engine]);
  const sales = useMemo(
    () => getSalesList(engine, isOwner ? { date, staffId: staffId || undefined } : { date, onlyUserId: currentUser.id }),
    [engine, date, staffId, isOwner, currentUser.id, refreshTick]
  );
  const summary = useMemo(() => (isOwner ? computeEodSummary(engine, date) : null), [engine, date, isOwner, refreshTick]);
  const locked = useMemo(() => isDayLocked(engine, date), [engine, date, refreshTick]);
  const variance = countedCash !== '' && summary ? Number(countedCash) - summary.expectedCash : null;

  const confirmVoid = async () => {
    setVoidBusy(true);
    try {
      const confirmed = await requestReauth();
      if (confirmed) {
        await voidSale(engine, { saleId: voidTarget.id, userId: currentUser.id });
        setRefreshTick((t) => t + 1);
      }
    } finally {
      setVoidBusy(false);
      setVoidTarget(null);
    }
  };

  const handleCloseDay = async () => {
    setCloseError('');
    const confirmed = await requestReauth();
    if (!confirmed) return;
    setClosing(true);
    try {
      await closeDay(engine, { date, countedCash: Number(countedCash), userId: currentUser.id });
      setRefreshTick((t) => t + 1);
    } catch (err) {
      setCloseError(err.message);
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="screen">
      <TopBar title={isOwner ? 'Sales History / End of Day' : 'My Sales'} />
      <div className="screen-body stack">
        <div className="grid-2">
          <div className="field">
            <label>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayISO()} />
          </div>
          {isOwner && (
            <div className="field">
              <label>Staff</label>
              <select value={staffId} onChange={(e) => setStaffId(e.target.value)}>
                <option value="">All staff</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isOwner && summary && (
          <div className="card stack">
            <div className="row-between">
              <span className="hero-label" style={{ color: 'var(--color-sub)' }}>Gross profit</span>
              {locked && <span className="pill pill-neutral">Day closed</span>}
            </div>
            <div className="hero-value tabular" style={{ color: 'var(--color-primary)' }}>{formatMoney(summary.grossProfit)}</div>
            <div className="grid-2">
              <div>Total sales: <strong className="tabular">{formatMoney(summary.totalSales)}</strong></div>
              <div>Total cost: <strong className="tabular">{formatMoney(summary.totalCost)}</strong></div>
              <div>Transactions: <strong className="tabular">{summary.transactions}</strong></div>
              <div>Voided: <strong className="tabular">{summary.voidCount}</strong></div>
            </div>
            {summary.adjustmentsByStaff.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Adjustments by staff ({summary.adjustmentsCount})</div>
                {summary.adjustmentsByStaff.map((a) => (
                  <div key={a.userId} className="row-between" style={{ fontSize: 'var(--fs-small)' }}>
                    <span>{a.staffName}</span>
                    <span className="tabular">−{a.removed} / +{a.added} ({a.count})</span>
                  </div>
                ))}
              </div>
            )}

            <hr className="divider" />
            <div className="stack-sm">
              <div className="row-between">
                <span>Expected cash (Cash sales)</span>
                <strong className="tabular">{formatMoney(summary.expectedCash)}</strong>
              </div>
              {!locked ? (
                <>
                  <div className="field">
                    <label>Counted cash</label>
                    <input type="number" min="0" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} />
                  </div>
                  {variance !== null && <VariancePill variance={variance} />}
                  {closeError && <div className="field-error" role="alert">⚠ {closeError}</div>}
                  <button className="btn btn-primary btn-cta" disabled={countedCash === '' || closing} onClick={handleCloseDay}>
                    {closing ? 'Closing…' : 'Close Day'}
                  </button>
                </>
              ) : (
                <p style={{ color: 'var(--color-sub)', fontSize: 'var(--fs-small)' }}>
                  This date is closed and locked — no further sales, voids, or adjustments can be written to it.
                </p>
              )}
            </div>
          </div>
        )}

        <div className="stack-sm">
          {sales.length === 0 ? (
            <EmptyState icon="🧾" title="No sales for this day" message="Sales recorded on this date will appear here." />
          ) : (
            sales.map((s) => (
              <div key={s.id} className="list-row" style={{ opacity: s.status === 'void' ? 0.6 : 1 }}>
                <div className="row-between">
                  <div style={{ textDecoration: s.status === 'void' ? 'line-through' : 'none' }}>
                    <div style={{ fontWeight: 600 }}>
                      #{s.receiptNo} · {s.time} · {s.paymentMethod}
                    </div>
                    <div style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>{s.itemsSummary}</div>
                    <div style={{ fontSize: 'var(--fs-micro)', color: 'var(--color-faint)' }}>{s.soldByName}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="tabular" style={{ fontWeight: 700 }}>{formatMoney(s.totalAmount)}</div>
                    {isOwner && <div className="tabular" style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>profit {formatMoney(s.totalAmount - s.totalCost)}</div>}
                    {s.status === 'void' && <span className="pill pill-danger">VOID</span>}
                  </div>
                </div>
                {isOwner && s.status === 'active' && !locked && (
                  <button className="link-btn" style={{ marginTop: 8 }} onClick={() => setVoidTarget(s)}>
                    Void sale
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {voidTarget && (
        <ConfirmDialog
          title="Confirm void"
          message={`Confirm void — restores stock for receipt #${voidTarget.receiptNo}. This cannot be undone.`}
          confirmLabel="Void sale"
          danger
          busy={voidBusy}
          onConfirm={confirmVoid}
          onCancel={() => setVoidTarget(null)}
        />
      )}
    </div>
  );
}
