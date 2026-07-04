import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../lib/format';
import { getTodayStats, getMySalesCount, getExpiringBatchIds, getLowStockItems } from '../lib/queries';

export default function DashboardScreen() {
  const { engine, currentUser, logout } = useApp();
  const navigate = useNavigate();
  const isOwner = currentUser.role === 'owner';

  const stats = useMemo(() => (isOwner ? getTodayStats(engine) : null), [engine, isOwner]);
  const mySalesCount = useMemo(() => (!isOwner ? getMySalesCount(engine, currentUser.id) : null), [engine, isOwner, currentUser.id]);
  const expiring = useMemo(() => getExpiringBatchIds(engine), [engine]);
  const lowStock = useMemo(() => getLowStockItems(engine), [engine]);

  return (
    <div className="screen">
      <div className="topbar">
        <h1 className="topbar-title">Hi, {currentUser.name.split(' ')[0]}</h1>
        <button className="link-btn" onClick={() => navigate('/pin/change')}>PIN</button>
        <button
          className="link-btn"
          onClick={() => {
            logout();
            navigate('/');
          }}
        >
          Log out
        </button>
      </div>
      <div className="screen-body stack">
        {isOwner ? (
          <div className="hero-card">
            <div className="hero-label">Today&apos;s revenue</div>
            <div className="hero-value tabular">{formatMoney(stats.revenue)}</div>
            <div className="hero-chips">
              <div className="hero-chip">
                <div className="v tabular">{formatMoney(stats.profit)}</div>
                <div className="l">Profit</div>
              </div>
              <div className="hero-chip">
                <div className="v tabular">{stats.txCount}</div>
                <div className="l">Sales</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-card">
            <div className="hero-label">My sales today</div>
            <div className="hero-value tabular">{mySalesCount}</div>
          </div>
        )}

        {expiring.length > 0 && (
          <div
            className="card card-flush-left card-alert-danger tap-target"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/stock/list?filter=expiring')}
          >
            <strong>{expiring.length} batch{expiring.length === 1 ? '' : 'es'} expiring or expired</strong>
            <div style={{ color: 'var(--color-sub)', fontSize: 'var(--fs-small)' }}>Tap to review</div>
          </div>
        )}
        {lowStock.length > 0 && (
          <div
            className="card card-flush-left card-alert-warn tap-target"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/stock/list?filter=low')}
          >
            <strong>{lowStock.length} item{lowStock.length === 1 ? '' : 's'} low on stock</strong>
            <div style={{ color: 'var(--color-sub)', fontSize: 'var(--fs-small)' }}>Tap to review</div>
          </div>
        )}

        <button className="btn btn-primary btn-cta" onClick={() => navigate('/sale/new')}>
          + New Sale
        </button>

        <div className="nav-grid">
          {isOwner && (
            <button className="nav-tile" onClick={() => navigate('/stock/add')}>
              <span className="icon">📦</span>
              <span className="label">Add Stock</span>
            </button>
          )}
          <button className="nav-tile" onClick={() => navigate('/stock/list')}>
            <span className="icon">📋</span>
            <span className="label">Stock List</span>
          </button>
          <button className="nav-tile" onClick={() => navigate('/sales/history')}>
            <span className="icon">🧾</span>
            <span className="label">{isOwner ? 'Sales History / EOD' : 'My Sales'}</span>
          </button>
          {isOwner && (
            <button className="nav-tile" onClick={() => navigate('/activity')}>
              <span className="icon">🗂</span>
              <span className="label">Activity Log</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
