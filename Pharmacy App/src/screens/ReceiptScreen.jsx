import { useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getSaleDetail } from '../lib/queries';
import { formatMoney, formatDateTime } from '../lib/format';
import { shareReceipt, whatsappShareUrl } from '../lib/receipt';

export default function ReceiptScreen() {
  const { engine } = useApp();
  const { saleId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const sale = useMemo(() => location.state?.sale || getSaleDetail(engine, saleId), [engine, saleId, location.state]);

  if (!sale) {
    return (
      <div className="screen">
        <div className="screen-body">Receipt not found.</div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-body stack">
        <div style={{ textAlign: 'center', margin: '24px 0 8px' }}>
          <div style={{ fontSize: 48 }} aria-hidden="true">✅</div>
          <h1 style={{ margin: '8px 0 0' }}>Sale complete</h1>
          <p style={{ color: 'var(--color-sub)' }}>Receipt #{sale.receiptNo}</p>
        </div>

        <div className="card stack-sm">
          <div className="row-between" style={{ color: 'var(--color-sub)', fontSize: 'var(--fs-small)' }}>
            <span>{formatDateTime(sale.date, sale.time)}</span>
            <span>{sale.paymentMethod}</span>
          </div>
          <hr className="divider" />
          {sale.lines.map((l, i) => (
            <div key={i} className="row-between">
              <span>{l.itemName} × {l.quantity}</span>
              <span className="tabular">{formatMoney(l.unitPrice * l.quantity)}</span>
            </div>
          ))}
          <hr className="divider" />
          <div className="row-between" style={{ fontWeight: 700, fontSize: 'var(--fs-h2)' }}>
            <span>Total</span>
            <span className="tabular">{formatMoney(sale.totalAmount)}</span>
          </div>
          {sale.treatmentNote && (
            <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-sub)' }}>Note: {sale.treatmentNote}</p>
          )}
          <p style={{ fontSize: 'var(--fs-small)', color: 'var(--color-faint)' }}>Served by {sale.soldByName}</p>
        </div>

        <div className="grid-2">
          <button className="btn btn-secondary" onClick={() => shareReceipt(sale)}>
            Share PDF
          </button>
          <a className="btn btn-secondary" href={whatsappShareUrl(sale)} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        </div>

        <button className="btn btn-primary btn-cta" onClick={() => navigate('/sale/new')}>
          Next Sale
        </button>
        <button className="btn btn-ghost btn-block" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
