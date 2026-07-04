export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel, busy }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="modal stack">
        <h2 id="confirm-title" className="font-display" style={{ margin: 0, fontSize: 'var(--fs-h1)' }}>
          {title}
        </h2>
        <p style={{ margin: 0, color: 'var(--color-sub)' }}>{message}</p>
        <div className="row" style={{ justifyContent: 'flex-end', marginTop: 'var(--space-3)' }}>
          <button className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={busy}>
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
