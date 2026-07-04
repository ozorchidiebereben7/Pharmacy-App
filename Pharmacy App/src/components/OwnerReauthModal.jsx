import { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

export function OwnerReauthModal() {
  const { reauthRequest, submitReauth, cancelReauth } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Each privileged action opens a new reauthRequest object while this
  // component stays mounted — reset so a prior action's digits/state can't
  // leak into (and silently block) the next one.
  useEffect(() => {
    if (reauthRequest) {
      setPin('');
      setError('');
      setBusy(false);
    }
  }, [reauthRequest]);

  if (!reauthRequest) return null;

  const press = (digit) => {
    if (pin.length >= 4) return;
    setPin(pin + digit);
    setError('');
  };

  const submit = async (fullPin) => {
    setBusy(true);
    const ok = await submitReauth(fullPin);
    setBusy(false);
    if (!ok) {
      setError('Incorrect PIN — try again');
      setTimeout(() => setError(''), 500);
      setPin('');
    }
  };

  const handleDigit = (d) => {
    const next = pin + d;
    press(d);
    if (next.length === 4) submit(next);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reauth-title">
      <div className="modal stack">
        <h2 id="reauth-title" className="font-display" style={{ margin: 0, fontSize: 'var(--fs-h1)' }}>
          Owner PIN required
        </h2>
        <p style={{ margin: 0, color: 'var(--color-sub)' }}>This action needs the owner PIN to continue.</p>
        <div className="keypad-dots">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`keypad-dot ${pin.length > i ? 'filled' : ''}`} />
          ))}
        </div>
        <div style={{ minHeight: 20, textAlign: 'center' }}>
          {error && <span className="field-error" role="alert">{error}</span>}
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} className="keypad-key" disabled={busy} onClick={() => handleDigit(d)}>
              {d}
            </button>
          ))}
          <button className="keypad-key" disabled={busy} onClick={() => { setPin(''); setError(''); }}>
            Clear
          </button>
          <button className="keypad-key" disabled={busy} onClick={() => handleDigit('0')}>
            0
          </button>
          <button className="keypad-key" disabled={busy} onClick={() => setPin(pin.slice(0, -1))}>
            ⌫
          </button>
        </div>
        <button className="btn btn-secondary btn-block" onClick={cancelReauth} disabled={busy}>
          Cancel
        </button>
      </div>
    </div>
  );
}
